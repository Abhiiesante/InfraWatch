# Camera Service

> **IEKB Section:** 03 — Backend  
> **Document:** 07-camera-service.md  
> **Last Updated:** 2026-07-16  
> **Owner:** Backend Lead  
> **Status:** Approved

---

## Table of Contents

1. [Overview](#overview)
2. [Service Implementation](#service-implementation)
3. [Status Tracking (Heartbeats)](#status-tracking-heartbeats)
4. [V1.1 Preparation: AI Streaming](#v11-preparation-ai-streaming)
5. [Related Documents](#related-documents)

---

## Overview

The `CameraService` manages the lifecycle of cameras and visual sensors. While V0 primarily focuses on camera inventory and asset linking, the service architecture is designed to support V1.1 streaming and AI inference by strictly validating connection parameters (RTSP URLs, IPs).

---

## Service Implementation

```typescript
// src/modules/cameras/camera.service.ts
import { prisma } from '@/config/prisma';
import { AppError } from '@/utils/errors';
import type { Prisma } from '@prisma/client';
import type { CreateCameraDto, CameraListOptions } from './camera.schema';

export class CameraService {
  
  /**
   * Retrieves a paginated list of cameras for a tenant.
   */
  async list(tenantId: number, options: CameraListOptions) {
    const { page = 1, limit = 20, assetId, status, type } = options;
    const skip = (page - 1) * limit;

    // tenantId is included explicitly (belt-and-suspenders). The Prisma extension
    // also auto-injects it, and Postgres RLS enforces it independently. See:
    // ../11-multi-tenancy/01-prisma-rls-extensions.md
    const where: Prisma.CameraWhereInput = {
      tenantId,
      ...(assetId && { assetId }),
      ...(status && { status }),
      ...(type && { cameraType: type }),
    };

    const [items, total] = await Promise.all([
      prisma.camera.findMany({
        where, skip, take: limit,
        orderBy: { name: 'asc' },
        include: {
          asset: { select: { id: true, name: true } }
        }
      }),
      prisma.camera.count({ where })
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /**
   * Creates a camera, validating the asset link if provided.
   */
  async create(tenantId: number, data: CreateCameraDto) {
    // 1. If linking to an asset, ensure the asset exists and belongs to the tenant
    if (data.assetId) {
      const asset = await prisma.asset.findFirst({
        where: { id: data.assetId, tenantId, deletedAt: null }
      });
      if (!asset) throw new AppError('NOT_FOUND', 'Linked asset not found', 404);
    }

    // 2. Validate RTSP URL format (if provided)
    if (data.rtspUrl && !data.rtspUrl.startsWith('rtsp://') && !data.rtspUrl.startsWith('rtsps://')) {
      throw new AppError('BAD_REQUEST', 'Invalid RTSP URL format', 400);
    }

    return prisma.camera.create({
      data: {
        tenantId,
        ...data,
        config: data.config || {},
      },
      include: { asset: { select: { id: true, name: true } } }
    });
  }

  /**
   * Links or unlinks a camera from an asset.
   */
  async updateAssetLink(tenantId: number, cameraId: number, assetId: number | null) {
    // If linking, verify asset exists
    if (assetId) {
      const asset = await prisma.asset.findFirst({
        where: { id: assetId, tenantId, deletedAt: null }
      });
      if (!asset) throw new AppError('NOT_FOUND', 'Asset not found', 404);
    }

    return prisma.camera.update({
      where: { id: cameraId, tenantId },
      data: { assetId }
    });
  }
}

export const cameraService = new CameraService();
```

---

## Status Tracking (Heartbeats)

To know if a camera is online, the system relies on a heartbeat mechanism.

```typescript
/**
 * Updates the lastSeenAt timestamp for a camera.
 * This will be called by the V1.1 streaming ingestion worker.
 */
async logHeartbeat(tenantId: number, cameraId: number) {
  return prisma.camera.update({
    where: { id: cameraId, tenantId },
    data: { 
      status: 'ACTIVE',
      lastSeenAt: new Date() 
    }
  });
}
```

A scheduled job (cron) runs every 5 minutes to mark cameras as `OFFLINE` if they haven't sent a heartbeat in the last 15 minutes.

```typescript
// src/jobs/camera-status.job.ts
async function markOfflineCameras() {
  const threshold = new Date(Date.now() - 15 * 60 * 1000); // 15 mins ago
  
  const result = await prisma.camera.updateMany({
    where: {
      status: 'ACTIVE',
      lastSeenAt: { lt: threshold }
    },
    data: { status: 'OFFLINE' }
  });
  
  logger.info(`Marked ${result.count} cameras as offline`);
}
```

---

## V1.1 Preparation: AI Streaming

In V1.1, the `CameraService` will be expanded to interact with the **Video Ingestion Worker** (a Python/GStreamer service). 

When a user requests a live stream on the frontend:
1. Express API calls `cameraService.requestStreamToken(cameraId)`.
2. Service generates a short-lived token.
3. Frontend uses token to connect via WebRTC to the Video Ingestion Worker.
4. The DB's `rtsp_url` is passed internally to the Python worker to open the feed.

*Note: For V0, camera feeds are not actively streamed; they are treated strictly as inventory.*

---

## Related Documents

- **Database:** [Camera Table](../01-database/07-camera-table.md)
- **API:** [Asset & Camera Endpoints](../04-api/04-asset-camera-endpoints.md)
- **AI (Future):** [Data Pipeline](../13-ai/01-data-pipeline.md)
- **Index:** [IEKB Master Index](../00-foundation/00-IEKB-index.md)
