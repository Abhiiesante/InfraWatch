# Image Processing Worker

> **IEKB Section:** 06 — Workers  
> **Document:** 02-image-processing-worker.md  
> **Last Updated:** 2026-07-16  
> **Owner:** Backend Lead  
> **Status:** Approved

---

## Table of Contents

1. [Overview](#overview)
2. [Worker Implementation](#worker-implementation)
3. [Sharp Library Configuration](#sharp-library-configuration)
4. [Memory Management](#memory-management)
5. [Related Documents](#related-documents)

---

## Overview

When a user uploads a high-resolution photo (e.g., a 12MB 4K image from a modern smartphone) during an inspection, loading that full image on the frontend dashboard is terribly slow and eats bandwidth. 

The Image Processing Worker listens to the `ImageQueue`, downloads the original image from S3, generates a web-optimized thumbnail, uploads the thumbnail back to S3, and updates the database record.

---

## Worker Implementation

We use the popular **Sharp** library for Node.js to perform the image resizing.

```typescript
// src/modules/inspections/image.worker.ts
import { Job } from 'bullmq';
import { prisma } from '@/config/prisma';
import { downloadFromS3, uploadToS3 } from '@/utils/s3';
import { generateThumbnail } from '@/utils/imageProcessor';

interface ImageJobPayload {
  imageId: number;
  objectKey: string;
}

export async function handleImageJob(job: Job<ImageJobPayload>) {
  const { imageId, objectKey } = job.data;

  try {
    // 1. Download original from S3 to a buffer in memory
    const originalBuffer = await downloadFromS3(objectKey);

    // 2. Generate optimized thumbnail (JPEG, 800px width max)
    const thumbnailBuffer = await generateThumbnail(originalBuffer, 800);

    // 3. Upload thumbnail to S3 (add _thumb suffix)
    const thumbObjectKey = objectKey.replace('/original/', '/thumbnails/').replace(/\.[^/.]+$/, "_thumb.jpg");
    const thumbUrl = await uploadToS3(thumbObjectKey, thumbnailBuffer, 'image/jpeg');

    // 4. Update Database
    await prisma.inspectionImage.update({
      where: { id: imageId },
      data: { thumbnailUrl: thumbUrl }
    });

  } catch (error) {
    console.error(`Failed to process image ${imageId}:`, error);
    // Let BullMQ handle retries
    throw error;
  }
}
```

---

## Sharp Library Configuration

Sharp is highly efficient because it uses libvips (written in C) under the hood.

```typescript
// src/utils/imageProcessor.ts
import sharp from 'sharp';

/**
 * Resizes an image buffer to a maximum width, converting to JPEG.
 */
export async function generateThumbnail(buffer: Buffer, maxWidth: number = 800): Promise<Buffer> {
  return sharp(buffer)
    // Resize, keeping aspect ratio. 
    // withoutEnlargement ensures small images aren't stretched.
    .resize({ width: maxWidth, withoutEnlargement: true })
    .jpeg({ quality: 80, progressive: true })
    .toBuffer();
}

/**
 * Strips EXIF data (like GPS coordinates) for privacy.
 * Used if the tenant settings require metadata stripping.
 */
export async function stripMetadata(buffer: Buffer): Promise<Buffer> {
  // Cloning without keeping metadata strips EXIF
  return sharp(buffer).clone().toBuffer(); 
}
```

---

## Memory Management

Downloading files into memory buffers and processing them with Sharp is fast, but can lead to Out of Memory (OOM) errors if too many large files are processed simultaneously.

1. **Concurrency Control:** The BullMQ Worker is configured with a strict concurrency limit (e.g., 5).
2. **Streaming (Alternative):** If V1.1 starts handling massive video files, buffers will crash the Node process. We would need to refactor `downloadFromS3` and `uploadToS3` to use Node.js Streams directly piped through Sharp, bypassing full in-memory loading.

---

## Related Documents

- **Architecture:** [BullMQ Architecture](./00-bullmq-architecture.md)
- **Frontend:** [Inspection Image Uploads](../05-frontend/08-inspection-pages.md)
- **Service:** [Inspection Service](../03-backend/08-inspection-service.md)
- **Index:** [IEKB Master Index](../00-foundation/00-IEKB-index.md)
