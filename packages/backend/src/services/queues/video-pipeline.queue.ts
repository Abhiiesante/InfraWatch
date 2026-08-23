import { Queue, Worker, Job } from 'bullmq';
import { VideoPipelineOrchestrator } from '../agents/video-pipeline.orchestrator.js';
import logger from '@/utils/logger.js';

export interface VideoJobData {
  videoId: number;
  tenantId: number;
  storageKey: string;
  targetFrameBudget?: number;
}

export class VideoPipelineQueue {
  private static queue: Queue<VideoJobData> | null = null;
  private static worker: Worker<VideoJobData> | null = null;
  private static isUsingFallback = false;

  // In-memory fallback queue when Redis is unavailable
  private static memoryQueue: VideoJobData[] = [];
  private static activeJobsCount = 0;
  private static maxConcurrency = parseInt(process.env.VIDEO_PIPELINE_CONCURRENCY || '2', 10);

  /**
   * Initialize BullMQ queue and worker with automatic Redis connection check.
   */
  static init() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

    try {
      // Parse Redis connection details
      const url = new URL(redisUrl);
      const connection = {
        host: url.hostname || 'localhost',
        port: parseInt(url.port || '6379', 10),
        password: url.password || undefined,
        maxRetriesPerRequest: null,
      };

      this.queue = new Queue<VideoJobData>('video-pipeline-queue', {
        connection,
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
          removeOnComplete: 100,
          removeOnFail: 500,
        },
      });

      this.worker = new Worker<VideoJobData>(
        'video-pipeline-queue',
        async (job: Job<VideoJobData>) => {
          logger.info(`⚙️ [BullMQ:Worker] Processing job #${job.id} (Video #${job.data.videoId}, Attempt ${job.attemptsMade + 1})...`);
          const result = await VideoPipelineOrchestrator.runPipeline(
            job.data.videoId,
            job.data.tenantId,
            job.data.storageKey,
            { targetFrameBudget: job.data.targetFrameBudget }
          );

          if (!result.success) {
            throw new Error(result.error || 'Video analysis pipeline failed');
          }
          return result;
        },
        {
          connection,
          concurrency: this.maxConcurrency,
        }
      );

      this.worker.on('completed', (job) => {
        logger.info(`✅ [BullMQ:Worker] Job #${job.id} completed successfully for video #${job.data.videoId}.`);
      });

      this.worker.on('failed', (job, err) => {
        logger.error(`❌ [BullMQ:Worker] Job #${job?.id} failed for video #${job?.data.videoId}: ${err.message}`);
      });

      this.worker.on('error', (err) => {
        // Fall back gracefully to in-memory processing if Redis is offline
        if (!this.isUsingFallback) {
          logger.warn(`⚠️ [BullMQ:Worker] Redis connection issue (${err.message}). Switching to resilient in-memory concurrency queue.`);
          this.isUsingFallback = true;
        }
      });

      logger.info(`📦 [VideoPipelineQueue] BullMQ queue initialized with concurrency=${this.maxConcurrency}.`);
    } catch (err: any) {
      logger.warn(`⚠️ [VideoPipelineQueue] BullMQ init failed (${err.message}). Using resilient in-memory concurrency queue.`);
      this.isUsingFallback = true;
    }
  }

  /**
   * Enqueue a video analysis job.
   */
  static async addJob(data: VideoJobData): Promise<{ jobId: string; mode: 'bullmq' | 'memory' }> {
    if (!this.queue && !this.isUsingFallback) {
      this.init();
    }

    if (!this.isUsingFallback && this.queue) {
      try {
        const job = await this.queue.add(`video-${data.videoId}`, data);
        logger.info(`📥 [VideoPipelineQueue] Enqueued video #${data.videoId} into BullMQ (Job ID: ${job.id}).`);
        return { jobId: String(job.id), mode: 'bullmq' };
      } catch (err: any) {
        logger.warn(`⚠️ [VideoPipelineQueue] Failed to add to BullMQ (${err.message}). Falling back to in-memory queue.`);
        this.isUsingFallback = true;
      }
    }

    // In-memory queue fallback with bounded concurrency
    const memoryJobId = `mem-${data.videoId}-${Date.now()}`;
    this.memoryQueue.push(data);
    logger.info(`📥 [VideoPipelineQueue] Enqueued video #${data.videoId} into in-memory queue (Active: ${this.activeJobsCount}/${this.maxConcurrency}, Pending: ${this.memoryQueue.length}).`);
    this.processMemoryQueue();

    return { jobId: memoryJobId, mode: 'memory' };
  }

  /**
   * Process in-memory queue with strict bounded concurrency limiter and retry loop.
   */
  private static async processMemoryQueue() {
    if (this.activeJobsCount >= this.maxConcurrency || this.memoryQueue.length === 0) {
      return;
    }

    const jobData = this.memoryQueue.shift();
    if (!jobData) return;

    this.activeJobsCount++;
    logger.info(`⚙️ [MemoryQueue:Runner] Starting video #${jobData.videoId} (Active: ${this.activeJobsCount}/${this.maxConcurrency})...`);

    // Execute with retry logic (up to 3 attempts with exponential backoff)
    (async () => {
      let attempts = 0;
      let success = false;
      const maxAttempts = 3;

      while (attempts < maxAttempts && !success) {
        attempts++;
        try {
          const result = await VideoPipelineOrchestrator.runPipeline(
            jobData.videoId,
            jobData.tenantId,
            jobData.storageKey,
            { targetFrameBudget: jobData.targetFrameBudget }
          );

          if (result.success) {
            success = true;
            logger.info(`✅ [MemoryQueue:Runner] Video #${jobData.videoId} finished successfully.`);
          } else {
            throw new Error(result.error || 'Pipeline execution failed');
          }
        } catch (err: any) {
          logger.warn(`⚠️ [MemoryQueue:Runner] Video #${jobData.videoId} attempt ${attempts}/${maxAttempts} failed: ${err.message}`);
          if (attempts < maxAttempts) {
            const delayMs = Math.pow(2, attempts) * 2000;
            await new Promise((r) => setTimeout(r, delayMs));
          }
        }
      }
    })().finally(() => {
      this.activeJobsCount--;
      this.processMemoryQueue();
    });
  }
}
