# Scheduled Jobs (Cron)

> **IEKB Section:** 06 — Workers  
> **Document:** 04-scheduled-jobs.md  
> **Last Updated:** 2026-07-16  
> **Owner:** Backend Lead  
> **Status:** Approved

---

## Table of Contents

1. [Overview](#overview)
2. [BullMQ Repeatable Jobs](#bullmq-repeatable-jobs)
3. [Camera Heartbeat Monitor](#camera-heartbeat-monitor)
4. [Overdue Inspection Scanner](#overdue-inspection-scanner)
5. [Related Documents](#related-documents)

---

## Overview

In addition to event-driven background tasks, InfraWatch requires tasks to run on a set schedule (cron jobs). We use BullMQ's **Repeatable Jobs** feature to handle this, ensuring that even if we scale up to 10 worker containers, a cron job is only executed exactly once per interval.

---

## BullMQ Repeatable Jobs

When the Worker process starts, it registers the scheduled jobs with Redis. Redis ensures they are fired at the correct intervals based on standard Cron expressions.

```typescript
// src/jobs/scheduler.ts
import { Queue } from 'bullmq';
import { redisConnection } from '@/config/redis';
import { logger } from '@/utils/logger';

export const cronQueue = new Queue('CronQueue', { connection: redisConnection });

export async function setupScheduledJobs() {
  logger.info('Registering scheduled jobs...');

  // 1. Camera Status Monitor (Every 5 minutes)
  await cronQueue.add('check-camera-status', {}, {
    repeat: { pattern: '*/5 * * * *' },
    jobId: 'cron-camera-status' // Unique ID prevents duplicate registration
  });

  // 2. Overdue Inspection Scanner (Daily at Midnight UTC)
  await cronQueue.add('scan-overdue-inspections', {}, {
    repeat: { pattern: '0 0 * * *' },
    jobId: 'cron-overdue-inspections'
  });
}
```

---

## Camera Heartbeat Monitor

As defined in the [Camera Service](../03-backend/07-camera-service.md), cameras ping the backend periodically. If a camera hasn't pinged in 15 minutes, it is considered offline.

```typescript
// src/jobs/handlers/camera-status.ts
import { prisma } from '@/config/prisma';
import { logger } from '@/utils/logger';
import { notificationQueue } from '@/queues';

export async function checkCameraStatus() {
  const threshold = new Date(Date.now() - 15 * 60 * 1000); // 15 mins ago
  
  // Find cameras that are currently ACTIVE but haven't been seen recently
  const staleCameras = await prisma.camera.findMany({
    where: {
      status: 'ACTIVE',
      lastSeenAt: { lt: threshold }
    },
    include: { asset: true }
  });

  if (staleCameras.length === 0) return;

  // Mark them offline
  await prisma.camera.updateMany({
    where: { id: { in: staleCameras.map(c => c.id) } },
    data: { status: 'OFFLINE' }
  });

  // Trigger Notifications (Optional feature)
  for (const cam of staleCameras) {
    await notificationQueue.add('camera-offline', {
      tenantId: cam.tenantId,
      cameraId: cam.id,
      cameraName: cam.name,
      assetName: cam.asset?.name
    });
  }

  logger.info(`Marked ${staleCameras.length} cameras as OFFLINE`);
}
```

---

## Overdue Inspection Scanner

Inspections have a `scheduledDate`. If that date passes and the status is still `SCHEDULED`, it must be marked `OVERDUE`.

```typescript
// src/jobs/handlers/overdue-inspections.ts
import { prisma } from '@/config/prisma';
import { logger } from '@/utils/logger';

export async function scanOverdueInspections() {
  const now = new Date();
  
  const result = await prisma.inspection.updateMany({
    where: {
      status: 'SCHEDULED',
      scheduledDate: { lt: now } // Date is in the past
    },
    data: {
      status: 'OVERDUE'
    }
  });

  logger.info(`Marked ${result.count} inspections as OVERDUE`);
}
```

---

## Related Documents

- **Architecture:** [BullMQ Architecture](./00-bullmq-architecture.md)
- **Service:** [Camera Service](../03-backend/07-camera-service.md)
- **Index:** [IEKB Master Index](../00-foundation/00-IEKB-index.md)
