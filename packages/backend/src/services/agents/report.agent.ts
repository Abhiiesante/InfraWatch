import prisma from '@/lib/prisma.js';
import { LLMService } from '../llm.service.js';
import logger from '@/utils/logger.js';

export class ReportAgent {
  /**
   * Synthesize a structured inspection report from triaged video findings.
   */
  static async generateVideoInspectionReport(
    videoId: number,
    tenantId: number
  ): Promise<{ reportId: number; summary: string; reportData: any }> {
    logger.info(`[ReportAgent] Generating synthesis report for video #${videoId}...`);

    const video = await prisma.inspectionVideo.findFirst({
      where: { id: videoId, tenantId },
      include: {
        asset: { include: { assetType: true } },
        uploadedBy: { select: { id: true, name: true, email: true } },
        findings: {
          orderBy: { frameTimestamp: 'asc' },
        },
      },
    });

    if (!video) {
      throw new Error(`Inspection video #${videoId} not found`);
    }

    const assetName = video.asset?.name || `Asset #${video.assetId}`;
    const assetType = video.asset?.assetType?.name || 'Infrastructure Asset';
    const totalFindings = video.findings.length;
    const criticalCount = video.findings.filter((f) => f.severity === 'CRITICAL').length;
    const highCount = video.findings.filter((f) => f.severity === 'HIGH').length;
    const mediumCount = video.findings.filter((f) => f.severity === 'MEDIUM').length;
    const lowCount = video.findings.filter((f) => f.severity === 'LOW').length;

    const findingsSummary = video.findings
      .map(
        (f) =>
          `[${f.frameTimestamp}s] ${f.defectType} (${f.confidence}% conf, Severity: ${f.severity}): ${f.triageNotes || 'Observed in visual scan.'}`
      )
      .join('\n') || 'No visual anomalies detected across sampled video frames.';

    const prompt = `You are the InfraWatch Lead Infrastructure Report Engineer. Synthesize a professional, comprehensive Video Inspection Report based on the following automated analysis data.

Asset: ${assetName} (${assetType})
Video: ${video.fileName} (Duration: ${video.durationSeconds}s, Frames Analyzed: ${video.frameCount})
Uploaded By: ${video.uploadedBy?.name || 'Field Inspector'}

Key Statistics:
- Total Findings: ${totalFindings}
- Critical Severity: ${criticalCount}
- High Severity: ${highCount}
- Medium Severity: ${mediumCount}
- Low Severity: ${lowCount}

Detailed Findings Timeline:
${findingsSummary}

Provide an Executive Inspection Narrative with:
1. Executive Summary (1-2 paragraphs)
2. Structural Integrity & Risk Assessment
3. Recommended Immediate & Preventive Corrective Actions`;

    let executiveSummary = `Automated Video Inspection Audit completed for ${assetName}. Analyzed ${video.frameCount} sampled frames across ${video.durationSeconds} seconds of inspection footage. Detected ${totalFindings} potential defect anomalies (${criticalCount} Critical, ${highCount} High, ${mediumCount} Medium, ${lowCount} Low).`;

    try {
      const llmText = await LLMService.generateCompletion(prompt, { temperature: 0.2 });
      if (llmText && llmText.length > 50) {
        executiveSummary = llmText;
      }
    } catch (err) {
      logger.warn(`[ReportAgent] LLM report generation fallback: ${err}`);
    }

    const reportData = {
      videoId: video.id,
      assetId: video.assetId,
      assetName,
      assetType,
      fileName: video.fileName,
      durationSeconds: Number(video.durationSeconds || 0),
      frameCount: video.frameCount,
      totalFindings,
      severityBreakdown: {
        critical: criticalCount,
        high: highCount,
        medium: mediumCount,
        low: lowCount,
      },
      findingsSample: video.findings.map((f) => ({
        id: f.id,
        defectType: f.defectType,
        confidence: Number(f.confidence),
        severity: f.severity,
        frameTimestamp: Number(f.frameTimestamp),
        frameImageUrl: f.frameImageUrl,
        triageNotes: f.triageNotes,
      })),
      executiveSummary,
      generatedAt: new Date().toISOString(),
    };

    // Create Report record in database
    const report = await prisma.report.create({
      data: {
        tenantId,
        title: `Video Inspection Analysis: ${assetName} (${video.fileName})`,
        type: 'VIDEO_INSPECTION_ANALYSIS',
        status: 'COMPLETED',
        format: 'PDF',
        summary: executiveSummary,
        data: reportData,
      },
    });

    // Update video record
    await prisma.inspectionVideo.update({
      where: { id: videoId },
      data: {
        status: 'COMPLETED',
        summary: executiveSummary,
      },
    });

    logger.info(`[ReportAgent] Report #${report.id} generated successfully for video #${videoId}.`);

    return {
      reportId: report.id,
      summary: executiveSummary,
      reportData,
    };
  }
}
