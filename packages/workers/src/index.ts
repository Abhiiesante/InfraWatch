import './workers';
import logger from './utils/logger';

const PORT = process.env.PORT || 3001;

async function startWorkers() {
  logger.info('🚀 Starting InfraWatch Workers...');

  try {
    // Workers are registered in workers.ts
    logger.info('✓ All workers initialized');
    logger.info('  - Report Generation Worker');
    logger.info('  - Image Processing Worker');
    logger.info('  - Notification Worker');

    logger.info(`Workers listening on Redis connection`);
    logger.info('Press Ctrl+C to stop workers');

    // Keep process alive
    process.on('SIGINT', () => {
      logger.info('Shutting down workers...');
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      logger.info('Shutting down workers...');
      process.exit(0);
    });
  } catch (error) {
    logger.error('Failed to start workers:', error);
    process.exit(1);
  }
}

startWorkers();
