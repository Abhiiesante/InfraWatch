import prisma from '@/lib/prisma.js';
import { StorageFactory } from '../storage/storage.adapter.js';
import { VideoIngestionAgent } from './video-ingestion.agent.js';
import { VisionAnalysisAgent } from './vision-analysis.agent.js';
import { TriageAgent } from './triage.agent.js';
import { ReportAgent } from './report.agent.js';
import logger from '@/utils/logger.js';

export interface PipelineProgressEvent {
  videoId: number;
  stage: 'INGESTION' | 'VISION_ANALYSIS' | 'TRIAGE' | 'REPORT' | 'COMPLETED' | 'FAILED';
  percent: number;
  message: string;
  details?: any;
}

export class VideoPipelineOrchestrator {
  private static ioInstance: any = null;

  static setSocketIO(io: any) {
    this.ioInstance = io;
  }

  private static emitProgress(event: PipelineProgressEvent) {
    if (this.ioInstance) {
      this.ioInstance.emit('video-pipeline-progress', event);
    }
  }

  /**
   * Execute the full 4-stage agentic video inspection pipeline.
   */
  static async runPipeline(
    videoId: number,
    tenantId: number,
    storageKeyOrPath: string,
    options: { targetFrameBudget?: number } = {}
  ): Promise<{ success: boolean; error?: string }> {
    logger.info(`🚀 [VideoPipelineOrchestrator] Starting video inspection pipeline for video #${videoId}...`);

    let cleanupTempFile: (() => Promise<void> | void) | null = null;

    try {
      const video = await prisma.inspectionVideo.findFirst({
        where: { id: videoId, tenantId },
      });

      if (!video) {
        throw new Error(`Video #${videoId} not found for tenant #${tenantId}`);
      }

      // 0. Resolve local path via StorageAdapter
      const storageKey = video.storageKey || storageKeyOrPath;
      const adapter = StorageFactory.getAdapterForStorageKey(storageKey);
      const { localPath, cleanup } = await adapter.resolveLocalPath(storageKey);
      cleanupTempFile = cleanup;

      // STAGE 1: INGESTION AGENT (Frame extraction with dynamic frame budgeting)
      this.emitProgress({
        videoId,
        stage: 'INGESTION',
        percent: 15,
        message: 'Extracting keyframes from video footage using ffmpeg...',
      });

      const ingestionResult = await VideoIngestionAgent.ingestVideo(
        videoId,
        tenantId,
        localPath,
        { targetFrameBudget: options.targetFrameBudget || Number(video.targetFrameBudget) || 45 }
      );

      // Clean up temporary downloaded file if from remote storage
      if (cleanupTempFile) {
        await cleanupTempFile();
        cleanupTempFile = null;
      }

      // STAGE 2: VISION ANALYSIS AGENT (Per-frame Roboflow defect detection & spatial deduplication)
      this.emitProgress({
        videoId,
        stage: 'VISION_ANALYSIS',
        percent: 40,
        message: `Running Roboflow computer vision analysis across ${ingestionResult.frames.length} sampled frames...`,
      });

      const visionResult = await VisionAnalysisAgent.analyzeFrames(
        videoId,
        tenantId,
        ingestionResult.frames,
        (processed, total) => {
          const subPercent = Math.round(40 + (processed / total) * 30);
          this.emitProgress({
            videoId,
            stage: 'VISION_ANALYSIS',
            percent: subPercent,
            message: `Analyzing frame ${processed} of ${total}...`,
          });
        }
      );

      // STAGE 3: TRIAGE AGENT (LLM operational risk assessment + AI Review Queue Gating)
      this.emitProgress({
        videoId,
        stage: 'TRIAGE',
        percent: 75,
        message: `Triaging ${visionResult.findingsCount} detected findings against asset maintenance history...`,
      });

      await TriageAgent.triageFindings(
        videoId,
        tenantId,
        video.assetId,
        visionResult.findings
      );

      // STAGE 4: REPORT AGENT (Executive Inspection Narrative Report synthesis)
      this.emitProgress({
        videoId,
        stage: 'REPORT',
        percent: 90,
        message: 'Synthesizing executive inspection intelligence report...',
      });

      const reportResult = await ReportAgent.generateVideoInspectionReport(videoId, tenantId);

      // COMPLETED
      this.emitProgress({
        videoId,
        stage: 'COMPLETED',
        percent: 100,
        message: 'Video inspection analysis pipeline completed successfully.',
        details: {
          findingsCount: visionResult.findingsCount,
          reportId: reportResult.reportId,
        },
      });

      logger.info(`✅ [VideoPipelineOrchestrator] Pipeline completed successfully for video #${videoId}.`);
      return { success: true };
    } catch (err: any) {
      logger.error(`❌ [VideoPipelineOrchestrator] Pipeline failed for video #${videoId}: ${err}`);

      await prisma.inspectionVideo.update({
        where: { id: videoId },
        data: {
          status: 'FAILED',
          summary: `Analysis pipeline error: ${err.message || String(err)}`,
        },
      }).catch(() => {});

      this.emitProgress({
        videoId,
        stage: 'FAILED',
        percent: 0,
        message: `Pipeline failed: ${err.message || 'Unknown error'}`,
      });

      return { success: false, error: err.message };
    } finally {
      if (cleanupTempFile) {
        try {
          await cleanupTempFile();
        } catch {
          // ignore
        }
      }
    }
  }
}
