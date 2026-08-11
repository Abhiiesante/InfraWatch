import { createApp } from './app.js';
import { env } from './config/env.js';
import logger from './utils/logger.js';
import prisma from './lib/prisma.js';
import { telemetryDaemon } from './services/telemetry-daemon.js';
import { cvDaemon } from './services/cv-daemon.js';

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(`🚀 Server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
  telemetryDaemon.start(); // Enabled: Now fetching purely from real-world official APIs
  cvDaemon.attachSocket(server);
  cvDaemon.start(100); // 10fps websocket broadcast
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
