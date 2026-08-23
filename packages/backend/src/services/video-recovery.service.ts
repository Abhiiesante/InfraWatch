import prisma from '@/lib/prisma.js';
import { VideoPipelineQueue } from './queues/video-pipeline.queue.js';
import logger from '@/utils/logger.js';

export class VideoRecoveryService {
  private static timer: NodeJS.Timeout | null = null;
  private static isRunning = false;
  private static retryTracker = new Map<number, number>();

  /**
   * Start the crash recovery and stuck pipeline sweep daemon.
   */
  static start(intervalMs = 5 * 60 * 1000) {
    if (this.isRunning) return;
    this.isRunning = true;

    const timeoutMinutes = parseInt(process.env.VIDEO_STUCK_TIMEOUT_MINUTES || '10', 10);
    logger.info(`🩹 [VideoRecoveryService] Started stuck video pipeline recovery daemon (Timeout: ${timeoutMinutes} minutes).`);

    // Run recovery sweep immediately on server startup to catch mid-crash jobs
    this.recoverStuckVideos(timeoutMinutes).catch((err) => {
      logger.error(`[VideoRecoveryService] Startup recovery sweep error: ${err}`);
    });

    // Recurring periodic sweep
    this.timer = setInterval(() => {
      this.recoverStuckVideos(timeoutMinutes).catch((err) => {
        logger.error(`[VideoRecoveryService] Periodic recovery sweep error: ${err}`);
      });
    }, intervalMs);
  }

  static stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.isRunning = false;
    logger.info('🩹 [VideoRecoveryService] Stopped stuck video pipeline recovery daemon.');
  }

  /**
   * Scan and heal stuck video pipelines.
   */
  static async recoverStuckVideos(timeoutMinutes = 10): Promise<{ recovered: number; failed: number }> {
    const cutoffDate = new Date(Date.now() - timeoutMinutes * 60 * 1000);

    const stuckVideos = await prisma.inspectionVideo.findMany({
      where: {
        status: { in: ['PENDING', 'EXTRACTING', 'ANALYZING'] },
        updatedAt: { lte: cutoffDate },
      },
      select: {
        id: true,
        tenantId: true,
        fileName: true,
        status: true,
        storageKey: true,
        fileUrl: true,
        targetFrameBudget: true,
        updatedAt: true,
      },
    });

    if (stuckVideos.length === 0) {
      return { recovered: 0, failed: 0 };
    }

    logger.warn(`🩹 [VideoRecoveryService] Found ${stuckVideos.length} stuck video pipeline(s) inactive since ${cutoffDate.toLocaleTimeString()}.`);

    let recovered = 0;
    let failed = 0;

    for (const video of stuckVideos) {
      const attempts = (this.retryTracker.get(video.id) || 0) + 1;
      this.retryTracker.set(video.id, attempts);

      const storageKey = video.storageKey || `local:${video.fileUrl.replace(/^\/uploads\//, '')}`;

      if (attempts <= 3) {
        logger.info(`🩹 [VideoRecoveryService] Auto-recovering stuck video #${video.id} ("${video.fileName}", status=${video.status}, attempt ${attempts}/3)...`);

        // Reset status to PENDING and re-enqueue
        await prisma.inspectionVideo.update({
          where: { id: video.id },
          data: {
            status: 'PENDING',
            summary: `Auto-recovery sweep re-enqueued pipeline (attempt ${attempts}/3).`,
          },
        });

        await VideoPipelineQueue.addJob({
          videoId: video.id,
          tenantId: video.tenantId,
          storageKey,
          targetFrameBudget: Number(video.targetFrameBudget) || 45,
        });

        recovered++;
      } else {
        logger.error(`❌ [VideoRecoveryService] Video #${video.id} failed after exceeding maximum recovery attempts (3). Marking as FAILED.`);

        await prisma.inspectionVideo.update({
          where: { id: video.id },
          data: {
            status: 'FAILED',
            summary: 'Pipeline execution timed out and failed across multiple crash recovery attempts.',
          },
        });

        this.retryTracker.delete(video.id);
        failed++;
      }
    }

    return { recovered, failed };
  }
}
