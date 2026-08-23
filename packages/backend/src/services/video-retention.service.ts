import prisma from '@/lib/prisma.js';
import { StorageFactory } from './storage/storage.adapter.js';
import logger from '@/utils/logger.js';

export class VideoRetentionService {
  private static timer: NodeJS.Timeout | null = null;
  private static isRunning = false;

  /**
   * Start the periodic retention daemon (runs on startup, then every 24 hours).
   */
  static start(intervalMs = 24 * 60 * 60 * 1000) {
    if (this.isRunning) return;
    this.isRunning = true;

    const retentionDays = parseInt(process.env.VIDEO_RETENTION_DAYS || '30', 10);
    logger.info(`🧹 [VideoRetentionService] Started raw video retention worker (Retention Period: ${retentionDays} days).`);

    // Run audit cycle immediately on boot
    this.purgeExpiredRawVideos(retentionDays).catch((err) => {
      logger.error(`[VideoRetentionService] Initial retention cycle error: ${err}`);
    });

    // Schedule recurring interval
    this.timer = setInterval(() => {
      this.purgeExpiredRawVideos(retentionDays).catch((err) => {
        logger.error(`[VideoRetentionService] Scheduled retention cycle error: ${err}`);
      });
    }, intervalMs);
  }

  static stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.isRunning = false;
    logger.info('🧹 [VideoRetentionService] Stopped raw video retention worker.');
  }

  /**
   * Enforce lifecycle retention policy:
   * Finds completed inspection videos past the retention threshold and removes the raw video file
   * via StorageAdapter while strictly preserving findings, positive frame thumbnails, and reports.
   */
  static async purgeExpiredRawVideos(retentionDays = 30): Promise<{ purgedCount: number }> {
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    logger.debug(`[VideoRetentionService] Scanning for raw videos older than ${cutoffDate.toISOString()}...`);

    const expiredVideos = await prisma.inspectionVideo.findMany({
      where: {
        status: 'COMPLETED',
        rawVideoDeleted: false,
        createdAt: { lte: cutoffDate },
      },
      select: {
        id: true,
        fileName: true,
        storageKey: true,
        createdAt: true,
      },
    });

    if (expiredVideos.length === 0) {
      logger.debug('[VideoRetentionService] No expired raw videos found.');
      return { purgedCount: 0 };
    }

    logger.info(`[VideoRetentionService] Found ${expiredVideos.length} raw video(s) past ${retentionDays}-day retention policy.`);

    let purgedCount = 0;
    for (const video of expiredVideos) {
      try {
        if (video.storageKey) {
          const adapter = StorageFactory.getAdapterForStorageKey(video.storageKey);
          await adapter.delete(video.storageKey);
        }

        await prisma.inspectionVideo.update({
          where: { id: video.id },
          data: {
            rawVideoDeleted: true,
            rawVideoDeletedAt: new Date(),
          },
        });

        purgedCount++;
        logger.info(`[VideoRetentionService] Purged raw video file for InspectionVideo #${video.id} ("${video.fileName}"). Defect findings & reports preserved.`);
      } catch (err) {
        logger.error(`[VideoRetentionService] Failed to purge raw video for InspectionVideo #${video.id}: ${err}`);
      }
    }

    return { purgedCount };
  }
}
