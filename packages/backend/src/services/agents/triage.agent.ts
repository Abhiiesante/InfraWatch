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
   * Triage raw video findings against asset operational context.
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

    const results: TriagedFindingResult[] = [];

    // 2. Triage each finding
    for (const finding of findings) {
      try {
        const prompt = `You are the InfraWatch Triage Agent. Evaluate this visual defect detection against asset history and return a JSON object (no markdown, just raw JSON):
{
  "severity": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
  "category": "Structural & Physical Integrity" | "Safety & Security Hazards" | "Electrical Systems & Substation Grid" | "HVAC & Mechanical Systems" | "General Infrastructure Maintenance",
  "rationale": "Brief engineering explanation",
  "recommendedAction": "Actionable inspector recommendation"
}

Asset Information:
- Name: ${assetName}
- Type: ${assetTypeName}
- Recent Incidents:
${recentIncidentsText}

Visual Finding:
- Defect Type: ${finding.defectType}
- Model Confidence: ${finding.confidence}%
- Timestamp in Video: ${finding.frameTimestamp}s
- Raw Severity Initial Tag: ${finding.severity}`;

        let severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' = finding.severity || 'MEDIUM';
        let rationale = `Visual inspection detected ${finding.defectType} with ${finding.confidence}% model confidence.`;
        let recommendedAction = 'Inspector verification required during scheduled sweep.';

        try {
          const response = await LLMService.generateCompletion(prompt, { temperature: 0.1 });
          const cleanJson = response.replace(/```json/g, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(cleanJson);

          if (parsed.severity) severity = parsed.severity;
          if (parsed.rationale) rationale = parsed.rationale;
          if (parsed.recommendedAction) recommendedAction = parsed.recommendedAction;
        } catch (llmErr) {
          logger.warn(`[TriageAgent] LLM reasoning fallback for finding #${finding.id}: ${llmErr}`);
        }

        // 3. Create AIEvent (Human-Gated Review Queue)
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

        // 4. Update VideoFinding with AIEvent and Triage Notes
        await prisma.videoFinding.update({
          where: { id: finding.id },
          data: {
            severity,
            aiEventId: aiEvent.id,
            triageNotes: `${rationale} — Recommended: ${recommendedAction}`,
          },
        });

        results.push({
          findingId: finding.id,
          aiEventId: aiEvent.id,
          severity,
          rationale,
          recommendedAction,
        });
      } catch (err) {
        logger.error(`[TriageAgent] Failed to triage finding #${finding.id}: ${err}`);
      }
    }

    logger.info(`[TriageAgent] Successfully triaged ${results.length} findings into AI Review Queue.`);
    return results;
  }
}
