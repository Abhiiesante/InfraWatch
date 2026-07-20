import { Queue, Worker } from 'bullmq';
import { createClient } from 'redis';
import logger from './utils/logger';

const redisConnection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
};

// Create queues
export const reportQueue = new Queue('reports', { connection: redisConnection });
export const imageQueue = new Queue('images', { connection: redisConnection });
export const notificationQueue = new Queue('notifications', {
  connection: redisConnection,
});

// Report Generation Worker
export const reportWorker = new Worker(
  'reports',
  async (job) => {
    logger.info(`Processing report generation job: ${job.id}`);
    try {
      const { organizationId, reportType, startDate, endDate } = job.data;

      // Simulate report generation
      await new Promise((resolve) => setTimeout(resolve, 2000));

      logger.info(`Report generated for org ${organizationId}: ${reportType}`);
      return {
        success: true,
        reportId: `report-${Date.now()}`,
        url: `/reports/report-${Date.now()}.pdf`,
      };
    } catch (error) {
      logger.error(`Report generation failed:`, error);
      throw error;
    }
  },
  { connection: redisConnection }
);

// Image Processing Worker
export const imageWorker = new Worker(
  'images',
  async (job) => {
    logger.info(`Processing image job: ${job.id}`);
    try {
      const { imageUrl, inspectionId, transformations } = job.data;

      // Simulate image processing (resize, compress, etc.)
      await new Promise((resolve) => setTimeout(resolve, 1000));

      logger.info(`Image processed for inspection ${inspectionId}`);
      return {
        success: true,
        processedUrl: imageUrl.replace(/\.\w+$/, '-processed.jpg'),
        thumbnailUrl: imageUrl.replace(/\.\w+$/, '-thumb.jpg'),
      };
    } catch (error) {
      logger.error(`Image processing failed:`, error);
      throw error;
    }
  },
  { connection: redisConnection }
);

// Notification Worker
export const notificationWorker = new Worker(
  'notifications',
  async (job) => {
    logger.info(`Processing notification job: ${job.id}`);
    try {
      const { type, userId, title, message, data } = job.data;

      // Simulate sending notification (email, SMS, push, etc.)
      await new Promise((resolve) => setTimeout(resolve, 500));

      logger.info(`Notification sent to user ${userId}: ${type}`);
      return {
        success: true,
        notificationId: `notif-${Date.now()}`,
        sentAt: new Date().toISOString(),
      };
    } catch (error) {
      logger.error(`Notification sending failed:`, error);
      throw error;
    }
  },
  { connection: redisConnection }
);

// Event listeners
reportWorker.on('completed', (job) => {
  logger.info(`✓ Report job ${job.id} completed`);
});

reportWorker.on('failed', (job, err) => {
  logger.error(`✗ Report job ${job?.id} failed: ${err.message}`);
});

imageWorker.on('completed', (job) => {
  logger.info(`✓ Image job ${job.id} completed`);
});

imageWorker.on('failed', (job, err) => {
  logger.error(`✗ Image job ${job?.id} failed: ${err.message}`);
});

notificationWorker.on('completed', (job) => {
  logger.info(`✓ Notification job ${job.id} completed`);
});

notificationWorker.on('failed', (job, err) => {
  logger.error(`✗ Notification job ${job?.id} failed: ${err.message}`);
});

// Health check
export const getWorkerStatus = () => {
  return {
    reportQueue: reportQueue.isPaused(),
    imageQueue: imageQueue.isPaused(),
    notificationQueue: notificationQueue.isPaused(),
    timestamp: new Date().toISOString(),
  };
};

export default {
  reportQueue,
  imageQueue,
  notificationQueue,
  reportWorker,
  imageWorker,
  notificationWorker,
};
