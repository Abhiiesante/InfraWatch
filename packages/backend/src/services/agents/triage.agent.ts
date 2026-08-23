import prisma from '@/lib/prisma.js';
import { LLMService } from '../llm.service.js';
import logger from '@/utils/logger.js';

export interface TriagedFindingResult {
  findingId: number;
  aiEventId: number;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  rationale: string;
  recommendedAction: string;
}

export class TriageAgent {
  /**
   * Triage raw video findings against asset operational context in concurrent batches.
   * Gated: All findings create pending AIEvents for human validation.
   */
  static async triageFindings(
    videoId: number,
    tenantId: number,
    assetId: number,
    findings: any[]
  ): Promise<TriagedFindingResult[]> {
    logger.info(`[TriageAgent] Triaging ${findings.length} findings for video #${videoId} on asset #${assetId}...`);

    if (findings.length === 0) {
      return [];
    }

    // 1. Gather Asset & Historical Context
    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
      include: {
        assetType: true,
        incidents: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: { title: true, severity: true, status: true },
        },
      },
    });

    const assetName = asset?.name || `Asset #${assetId}`;
    const assetTypeName = asset?.assetType?.name || 'General Infrastructure';
    const recentIncidentsText = (asset?.incidents || [])
      .map((i) => `- [${i.severity}] ${i.title} (${i.status})`)
      .join('\n') || 'None recorded';

    // 2. Chunk findings into batches of 5
    const BATCH_SIZE = 5;
    const batches: any[][] = [];
    for (let i = 0; i < findings.length; i += BATCH_SIZE) {
      batches.push(findings.slice(i, i + BATCH_SIZE));
    }

    logger.info(`[TriageAgent] Processing ${batches.length} batch(es) of findings with bounded concurrency.`);

    // 3. Process batches concurrently with max concurrency of 3
    const MAX_CONCURRENT_BATCHES = 3;
    const results: TriagedFindingResult[] = [];

    for (let i = 0; i < batches.length; i += MAX_CONCURRENT_BATCHES) {
      const activeBatches = batches.slice(i, i + MAX_CONCURRENT_BATCHES);
      
      const batchPromises = activeBatches.map(async (batch) => {
        const findingsPromptList = batch.map((f) => `
- ID: ${f.id}
  Defect Type: ${f.defectType}
  Model Confidence: ${f.confidence}%
  Timestamp: ${f.frameTimestamp}s
  Initial Severity Tag: ${f.severity}
`).join('\n');

        const prompt = `You are the InfraWatch Triage Agent. Evaluate this batch of visual defect detections against the asset history.
Return a valid JSON array of objects (one per finding ID). NO markdown fences, JUST the raw JSON array:
[
  {
    "findingId": <number>,
    "severity": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
    "rationale": "Brief engineering explanation",
    "recommendedAction": "Actionable inspector recommendation"
  }
]

Asset Context:
- Name: ${assetName}
- Type: ${assetTypeName}
- Recent Incidents:
${recentIncidentsText}

Visual Findings Batch:
${findingsPromptList}`;

        let parsedEvaluations: any[] = [];
        try {
          const response = await LLMService.generateCompletion(prompt, { temperature: 0.1 });
          const cleanJson = response.replace(/```json/g, '').replace(/```/g, '').trim();
          parsedEvaluations = JSON.parse(cleanJson);
        } catch (llmErr) {
          logger.warn(`[TriageAgent] Batch LLM evaluation fallback: ${llmErr}`);
        }

        const evalMap = new Map<number, any>();
        if (Array.isArray(parsedEvaluations)) {
          for (const ev of parsedEvaluations) {
            if (ev.findingId) {
              evalMap.set(Number(ev.findingId), ev);
            }
          }
        }

        // Process each finding in the batch
        const batchResults: TriagedFindingResult[] = [];
        for (const finding of batch) {
          try {
            const ev = evalMap.get(finding.id);
            const severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' =
              ev?.severity || finding.severity || 'MEDIUM';
            const rationale =
              ev?.rationale ||
              `Visual inspection detected ${finding.defectType} with ${finding.confidence}% model confidence.`;
            const recommendedAction =
              ev?.recommendedAction || 'Inspector verification required during scheduled sweep.';

            // Create AIEvent in Human-Gated Review Queue
            const aiEvent = await prisma.aIEvent.create({
              data: {
                tenantId,
                assetId,
                eventType: finding.defectType,
                severity,
                aggregateConfidence: finding.confidence,
                status: 'NEW',
                firstDetectedAt: new Date(),
                lastDetectedAt: new Date(),
                predictionCount: 1,
              },
            });

            // Update VideoFinding with AIEvent and Triage Notes
            await prisma.videoFinding.update({
              where: { id: finding.id },
              data: {
                severity,
                aiEventId: aiEvent.id,
                triageNotes: `${rationale} — Recommended: ${recommendedAction}`,
              },
            });

            batchResults.push({
              findingId: finding.id,
              aiEventId: aiEvent.id,
              severity,
              rationale,
              recommendedAction,
            });
          } catch (itemErr) {
            logger.error(`[TriageAgent] Failed to persist triage for finding #${finding.id}: ${itemErr}`);
          }
        }
        return batchResults;
      });

      const batchOutputs = await Promise.all(batchPromises);
      for (const out of batchOutputs) {
        results.push(...out);
      }
    }

    logger.info(`[TriageAgent] Successfully triaged ${results.length} findings into AI Review Queue via batched inference.`);
    return results;
  }
}
