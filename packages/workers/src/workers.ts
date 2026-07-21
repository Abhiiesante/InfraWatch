import { Queue, Worker } from 'bullmq';
import { createClient } from 'redis';
import logger from './utils/logger.js';
import prisma from './lib/prisma.js';
import sharp from 'sharp';

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
      const { tenantId, reportType, title } = job.data;

      // Real implementation: aggregate data from DB based on report type
      let data = {};
      
      if (reportType === 'ASSET_SUMMARY') {
        const assets = await prisma.asset.findMany({
          where: { tenantId },
          include: { assetType: true }
        });
        
        data = {
          totalAssets: assets.length,
          activeAssets: assets.filter(a => a.status === 'ACTIVE').length,
          byType: assets.reduce((acc: any, asset) => {
            const typeName = asset.assetType.name;
            acc[typeName] = (acc[typeName] || 0) + 1;
            return acc;
          }, {})
        };
      }

      // Save report back to DB
      const report = await prisma.report.create({
        data: {
          tenantId,
          title: title || `${reportType} Report`,
          type: reportType,
          data
        }
      });

      logger.info(`Report generated for tenant ${tenantId}: ${reportType}`);
      return { success: true, reportId: report.id };
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
      const { imageUrl, inspectionId } = job.data;

      // In a real app we'd fetch from S3, process, and upload back.
      // Here we simulate the processing steps using sharp for structure.
      logger.info(`Would download ${imageUrl}, resize via sharp, and upload back to S3`);
      
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
      const { type, userId, title, message } = job.data;

      // Find user to get email
      const user = await prisma.user.findUnique({ where: { id: userId } });
      
      if (!user) {
        throw new Error(`User ${userId} not found`);
      }

      // Real implementation would use nodemailer or AWS SES here
      logger.info(`Would send email to ${user.email}: [${title}] ${message}`);

      return {
        success: true,
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
