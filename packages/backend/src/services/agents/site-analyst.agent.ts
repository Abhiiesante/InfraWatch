import prisma from '@/lib/prisma.js';
import { LLMService, GenerateOptions } from '../llm.service.js';
import logger from '@/utils/logger.js';

export class SiteAnalystAgent {
  /**
   * Gather comprehensive grounded context across video analyses, findings, and reports.
   */
  static async gatherAnalystContext(tenantId: number, _query: string, assetId?: number): Promise<string> {
    const whereAsset: any = { tenantId };
    if (assetId) whereAsset.id = assetId;

    const [assets, recentVideos, recentFindings, recentReports] = await Promise.all([
      prisma.asset.findMany({
        where: whereAsset,
        take: 5,
        select: { id: true, name: true, status: true, healthScore: true, assetType: { select: { name: true } } },
      }),
      prisma.inspectionVideo.findMany({
        where: { tenantId, ...(assetId ? { assetId } : {}) },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          asset: { select: { name: true } },
          findings: { select: { defectType: true, severity: true, confidence: true, frameTimestamp: true } },
        },
      }),
      prisma.videoFinding.findMany({
        where: { tenantId, ...(assetId ? { video: { assetId } } : {}) },
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { video: { select: { fileName: true, asset: { select: { name: true } } } } },
      }),
      prisma.report.findMany({
        where: { tenantId, type: 'VIDEO_INSPECTION_ANALYSIS' },
        take: 3,
        orderBy: { createdAt: 'desc' },
        select: { id: true, title: true, summary: true, createdAt: true },
      }),
    ]);

    let context = `=== ENTERPRISE INFRASTRUCTURE CONTEXT ===\n`;

    context += `\n--- MONITORED ASSETS ---\n`;
    assets.forEach((a) => {
      context += `- [Asset #${a.id}] ${a.name} (${a.assetType?.name || 'General'}): Status=${a.status}, Health Score=${a.healthScore}%\n`;
    });

    context += `\n--- RECENT VIDEO INSPECTIONS ---\n`;
    recentVideos.forEach((v) => {
      const findingsSummary = v.findings.map((f) => `${f.defectType} (${f.severity})`).join(', ') || 'No defects';
      context += `- Video #${v.id} "${v.fileName}" for ${v.asset?.name || 'Asset'}: Status=${v.status}, Duration=${v.durationSeconds}s, Findings: ${findingsSummary}\n`;
    });

    context += `\n--- RECENT DETECTED FINDINGS ---\n`;
    recentFindings.forEach((f) => {
      context += `- [Finding #${f.id}] ${f.defectType} on ${f.video.asset?.name || 'Asset'} (Video: ${f.video.fileName} @ ${f.frameTimestamp}s) - Severity: ${f.severity}, Conf: ${f.confidence}%\n`;
    });

    context += `\n--- RECENT INSPECTION INTELLIGENCE REPORTS ---\n`;
    recentReports.forEach((r) => {
      context += `- [Report #${r.id}] ${r.title} (${r.createdAt.toISOString().slice(0, 10)}): ${r.summary?.slice(0, 200)}...\n`;
    });

    return context;
  }

  /**
   * Stream conversational response to operator query.
   */
  static async streamQuery(
    tenantId: number,
    query: string,
    onChunk: (chunk: string) => void,
    assetId?: number
  ): Promise<void> {
    logger.info(`[SiteAnalystAgent] Processing query: "${query}" (Tenant ${tenantId})`);

    const context = await this.gatherAnalystContext(tenantId, query, assetId);

    const systemInstruction = `You are the InfraWatch Site Analyst Agent, an expert infrastructure engineering and AI inspection copilot.
Your job is to answer the operator's questions accurately based ONLY on the provided infrastructure context and video analysis data.
- If the operator asks about inspection findings, cite the exact video, timestamp, defect type, and severity.
- If the context does not have information to answer a question, clearly explain what is currently recorded and what needs to be inspected.
- Format responses in clean, structured Markdown with bullet points, bold tags, and concise recommendations.
- Never invent imaginary defects or incidents not present in the context.`;

    const prompt = `Context:\n${context}\n\nOperator Query:\n${query}`;

    const options: GenerateOptions = {
      temperature: 0.2,
      systemInstruction,
    };

    await LLMService.streamCompletion(prompt, onChunk, options);
  }
}
