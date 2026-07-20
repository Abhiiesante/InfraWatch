# Inspection Service

> **IEKB Section:** 03 — Backend  
> **Document:** 08-inspection-service.md  
> **Last Updated:** 2026-07-16  
> **Owner:** Backend Lead  
> **Status:** Approved

---

## Table of Contents

1. [Overview](#overview)
2. [Service Implementation](#service-implementation)
3. [Image Upload Workflow](#image-upload-workflow)
4. [Compliance Metrics](#compliance-metrics)
5. [Related Documents](#related-documents)

---

## Overview

The `InspectionService` handles the scheduling, assignment, and completion of field inspections. It orchestrates complex transactions, ensuring that when an inspection is completed, the parent asset's status is updated if necessary.

---

## Service Implementation

```typescript
// src/modules/inspections/inspection.service.ts
import { prisma } from '@/config/prisma';
import { AppError, ForbiddenError } from '@/utils/errors';
import type { Prisma } from '@prisma/client';
import type { CreateInspectionDto, CompleteInspectionDto } from './inspection.schema';

export class InspectionService {

  /**
   * Schedules a new inspection.
   */
  async create(tenantId: number, data: CreateInspectionDto) {
    // 1. Verify Asset
    const asset = await prisma.asset.findFirst({
      where: { id: data.assetId, tenantId, deletedAt: null }
    });
    if (!asset) throw new AppError('NOT_FOUND', 'Asset not found', 404);

    // 2. Verify Inspector (if provided)
    if (data.inspectorId) {
      const inspector = await prisma.user.findFirst({
        where: { id: data.inspectorId, tenantId, isActive: true, role: { in: ['INSPECTOR', 'MANAGER'] } }
      });
      if (!inspector) throw new AppError('BAD_REQUEST', 'Invalid inspector assignment', 400);
    }

    return prisma.inspection.create({
      data: {
        tenantId,
        assetId: data.assetId,
        inspectorId: data.inspectorId,
        scheduledDate: new Date(data.scheduledDate),
      }
    });
  }

  /**
   * Completes an inspection. Enforces that INSPECTORs can only complete their own assignments.
   */
  async complete(
    tenantId: number, 
    userId: number, 
    userRole: string, 
    inspectionId: number, 
    data: CompleteInspectionDto
  ) {
    const inspection = await prisma.inspection.findFirst({
      where: { id: inspectionId, tenantId }
    });

    if (!inspection) throw new AppError('NOT_FOUND', 'Inspection not found', 404);
    if (inspection.status === 'COMPLETED' || inspection.status === 'CANCELLED') {
      throw new AppError('BAD_REQUEST', `Cannot complete a ${inspection.status} inspection`, 400);
    }

    // Role-based context authorization
    if (userRole === 'INSPECTOR' && inspection.inspectorId !== userId) {
      throw new ForbiddenError('You can only complete inspections assigned to you');
    }

    // Transaction: Complete inspection + optionally update asset status
    return prisma.$transaction(async (tx) => {
      const updated = await tx.inspection.update({
        where: { id: inspectionId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          notes: data.notes,
        }
      });

      if (data.updateAssetStatusTo) {
        await tx.asset.update({
          where: { id: inspection.assetId },
          data: { status: data.updateAssetStatusTo }
        });
      }

      return updated;
    });
  }
}

export const inspectionService = new InspectionService();
```

---

## Image Upload Workflow

Handling images attached to an inspection involves a multi-step process utilizing AWS S3 and a background worker.

### Phase 1: Pre-Signed URL Generation

Instead of streaming large image files through the Node.js API (which eats RAM and connection bandwidth), the backend generates a short-lived **S3 Pre-Signed URL**.

```typescript
// Inside src/modules/inspections/inspection.service.ts
import { generatePresignedUploadUrl } from '@/utils/s3';

async function getUploadUrl(tenantId: number, inspectionId: number, mimeType: string) {
  // 1. Verify inspection is active
  const inspection = await prisma.inspection.findFirst({
    where: { id: inspectionId, tenantId, status: { in: ['SCHEDULED', 'IN_PROGRESS', 'OVERDUE'] } }
  });
  if (!inspection) throw new AppError('BAD_REQUEST', 'Cannot add images to this inspection', 400);

  // 2. Generate unique object key
  const fileId = crypto.randomUUID();
  const extension = mimeType.split('/')[1] || 'jpg';
  const objectKey = `inspections/${tenantId}/${inspectionId}/original/${fileId}.${extension}`;

  // 3. Get S3 URL (valid for 5 mins)
  const uploadUrl = await generatePresignedUploadUrl(objectKey, mimeType);

  return { uploadUrl, objectKey };
}
```

### Phase 2: Client Upload & Confirmation

1. The frontend uses the `uploadUrl` to `PUT` the file directly to S3.
2. The frontend calls the API again to confirm the upload.

```typescript
async function confirmImageUpload(tenantId: number, inspectionId: number, objectKey: string) {
  // Generate the public/accessible URL
  const imageUrl = `https://${env.AWS_S3_BUCKET}.s3.amazonaws.com/${objectKey}`;

  // Save to DB
  const image = await prisma.inspectionImage.create({
    data: {
      inspectionId,
      imageUrl,
      // thumbnailUrl will be populated later by the background worker
    }
  });

  // Trigger background job to generate thumbnail
  await imageProcessingQueue.add('generate-thumbnail', { imageId: image.id, objectKey });

  return image;
}
```

---

## Compliance Metrics

Managers need to know if inspections are happening on time. The service includes a specific method for dashboard aggregations.

```typescript
async getComplianceStats(tenantId: number, startDate: Date, endDate: Date) {
  const stats = await prisma.inspection.groupBy({
    by: ['status'],
    where: {
      tenantId,
      scheduledDate: { gte: startDate, lte: endDate }
    },
    _count: { id: true }
  });

  // Format into a usable object
  const result = { SCHEDULED: 0, COMPLETED: 0, OVERDUE: 0, CANCELLED: 0, IN_PROGRESS: 0 };
  stats.forEach(s => result[s.status] = s._count.id);
  
  const total = Object.values(result).reduce((a, b) => a + b, 0);
  const complianceRate = total > 0 ? (result.COMPLETED / total) * 100 : 100;

  return { ...result, total, complianceRate };
}
```

---

## Related Documents

- **Database:** [Inspection Tables](../01-database/08-inspection-tables.md)
- **API:** [Inspection Endpoints](../04-api/05-inspection-endpoints.md)
- **Workers:** [Image Processing Worker](../07-workers/02-image-processing-worker.md)
- **Index:** [IEKB Master Index](../00-foundation/00-IEKB-index.md)
