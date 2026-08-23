import { createApp } from './app.js';
import { env } from './config/env.js';
import logger from './utils/logger.js';
import prisma from './lib/prisma.js';
import { telemetryDaemon } from './services/telemetry-daemon.js';
import { cvDaemon } from './services/cv-daemon.js';
import { GoldMetricsSyncService } from './services/gold-metrics-sync.service.js';
import { VideoRetentionService } from './services/video-retention.service.js';

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(`🚀 Server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
  telemetryDaemon.start(); // Real-world official telemetry APIs
  cvDaemon.attachSocket(server); // Socket.IO server for real-time video pipeline progress

  // Raw Video Retention Worker: Audits and enforces storage lifecycle policy
  VideoRetentionService.start();

  // Gold Metrics Sync: run immediately, then every 60 seconds
  GoldMetricsSyncService.syncAnomalyDetectionsToGold()
    .then(r => logger.info(`📊 Initial Gold sync: ${r.aggregated} buckets`))
    .catch(err => logger.error(`Gold sync error: ${err}`));

  setInterval(async () => {
    try {
      await GoldMetricsSyncService.syncLocalCVToGold();
      await GoldMetricsSyncService.syncAnomalyDetectionsToGold();
    } catch (err) {
      logger.error(`[GoldSync] Periodic sync error: ${err}`);
    }
  }, 60_000);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  server.close(async () => {
    await prisma.$disconnect();
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully...');
  server.close(async () => {
    await prisma.$disconnect();
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});
