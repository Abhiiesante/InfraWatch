# BullMQ Architecture & Infrastructure

> **IEKB Section:** 06 — Workers  
> **Document:** 00-bullmq-architecture.md  
> **Last Updated:** 2026-07-16  
> **Owner:** Backend Lead  
> **Status:** Approved

---

## Table of Contents

1. [Overview](#overview)
2. [Redis Dependency](#redis-dependency)
3. [Queue Configuration](#queue-configuration)
4. [Worker Process Isolation](#worker-process-isolation)
5. [Related Documents](#related-documents)

---

## Overview

InfraWatch offloads slow, CPU-intensive, or I/O bound tasks from the main Express HTTP server to background workers using **BullMQ**. 

Tasks such as generating PDF reports, resizing uploaded images, and sending emails/Slack messages must never block an HTTP request.

---

## Redis Dependency

BullMQ requires **Redis** (version 5.0+) to function. Redis acts as the message broker, storing job data, managing state (waiting, active, completed, failed), and handling job locks to ensure a job is processed by only one worker.

```typescript
// src/config/redis.ts
import { Redis } from 'ioredis';
import { env } from './env';

// Shared Redis connection for BullMQ
export const redisConnection = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null, // Required by BullMQ
  enableReadyCheck: false,
});
```

---

## Queue Configuration

A "Queue" is a channel where jobs are added. The HTTP server (Producer) adds jobs to the queue.

```typescript
// src/queues/index.ts
import { Queue } from 'bullmq';
import { redisConnection } from '@/config/redis';

// Define the queues
export const reportQueue = new Queue('ReportQueue', { connection: redisConnection });
export const imageQueue = new Queue('ImageQueue', { connection: redisConnection });
export const notificationQueue = new Queue('NotificationQueue', { connection: redisConnection });

/**
 * Example: Adding a job from a Controller or Service
 */
export async function dispatchNotification(payload: any) {
  await notificationQueue.add('send-alert', payload, {
    attempts: 3, // Retry up to 3 times on failure
    backoff: {
      type: 'exponential',
      delay: 5000 // 5s, 25s, 125s...
    },
    removeOnComplete: true, // Don't clog Redis with successful jobs
    removeOnFail: false,    // Keep failed jobs for debugging
  });
}
```

---

## Worker Process Isolation

While you *can* run BullMQ workers in the same Node.js process as the Express server, this defeats the purpose of offloading CPU-intensive tasks, as Node.js is single-threaded.

**Decision:** Workers are run in a completely separate Node.js process. In production, the HTTP API and the Worker application are deployed as separate Docker containers scaling independently.

```typescript
// src/worker.ts (Entry point for the Worker container)
import { Worker } from 'bullmq';
import { redisConnection } from '@/config/redis';
import { handleReportJob } from '@/modules/reports/report.worker';
import { handleImageJob } from '@/modules/inspections/image.worker';
import { handleNotificationJob } from '@/modules/notifications/notification.worker';
import { logger } from '@/utils/logger';

// 1. Report Worker
const reportWorker = new Worker('ReportQueue', handleReportJob, {
  connection: redisConnection,
  concurrency: 2, // Generate up to 2 reports concurrently per container
});

// 2. Image Worker
const imageWorker = new Worker('ImageQueue', handleImageJob, {
  connection: redisConnection,
  concurrency: 5, // Faster, less memory intensive
});

// 3. Notification Worker
const notificationWorker = new Worker('NotificationQueue', handleNotificationJob, {
  connection: redisConnection,
  concurrency: 10,
});

logger.info('Background workers started successfully');

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  logger.info('Shutting down workers...');
  await Promise.all([
    reportWorker.close(),
    imageWorker.close(),
    notificationWorker.close()
  ]);
  process.exit(0);
});
```

---

## Related Documents

- **Implementation:** [Report Generation Worker](./01-report-generation-worker.md)
- **Implementation:** [Notification Worker](./03-notification-worker.md)
- **Architecture:** [Backend Overview](../03-backend/00-backend-overview.md)
- **Index:** [IEKB Master Index](../00-foundation/00-IEKB-index.md)
