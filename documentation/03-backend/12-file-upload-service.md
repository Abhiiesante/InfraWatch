# File Upload Service (AWS S3)

> **IEKB Section:** 03 — Backend  
> **Document:** 12-file-upload-service.md  
> **Last Updated:** 2026-07-16  
> **Owner:** Backend Lead  
> **Status:** Approved

---

## Table of Contents

1. [Architecture Decision](#architecture-decision)
2. [Pre-Signed URL Generation](#pre-signed-url-generation)
3. [IAM Configuration](#iam-configuration)
4. [File Deletion Strategy](#file-deletion-strategy)
5. [Related Documents](#related-documents)

---

## Architecture Decision

In Node.js, parsing multi-part form data containing large files (images/videos) consumes significant memory and holds HTTP connections open, reducing the API's concurrency capabilities.

**Decision:** The InfraWatch API **never processes file uploads directly**. Instead, it generates S3 Pre-Signed URLs. The client browser uploads directly to the AWS S3 bucket, bypassing the Node.js server entirely.

---

## Pre-Signed URL Generation

```typescript
// src/utils/s3.ts
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '@/config/env';

const s3Client = new S3Client({
  region: env.AWS_REGION,
  // Credentials are automatically loaded from IAM Roles in production, 
  // or AWS_ACCESS_KEY_ID in local .env
});

/**
 * Generates a pre-signed URL allowing the client to upload a specific file.
 */
export async function generatePresignedUploadUrl(
  objectKey: string, 
  mimeType: string,
  expiresInSeconds: number = 300 // 5 minutes
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: env.AWS_S3_BUCKET,
    Key: objectKey,
    ContentType: mimeType,
    // Require the client to set this exact ACL
    ACL: 'public-read', 
  });

  return getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });
}

/**
 * Generates a unique object key structured by tenant and entity.
 */
export function generateObjectKey(
  tenantId: number, 
  entityType: 'inspections' | 'incidents' | 'avatars',
  entityId: number,
  filename: string
): string {
  const ext = filename.split('.').pop() || 'jpg';
  const uuid = crypto.randomUUID();
  return `${entityType}/${tenantId}/${entityId}/${uuid}.${ext}`;
}
```

### Usage in Controller

```typescript
// src/controllers/upload.controller.ts
import { Request, Response } from 'express';
import { generatePresignedUploadUrl, generateObjectKey } from '@/utils/s3';
import { catchAsync } from '@/utils/asyncHandler';

export const requestUpload = catchAsync(async (req: Request, res: Response) => {
  const { tenantId } = req.tenantContext;
  const { entityType, entityId, filename, mimeType } = req.body;
  
  // Important: Service layer should verify the user has permission to write to this entity
  // ... verification logic ...

  const objectKey = generateObjectKey(tenantId, entityType, entityId, filename);
  const uploadUrl = await generatePresignedUploadUrl(objectKey, mimeType);

  res.json({
    uploadUrl,
    objectKey,
    // The final public URL the image will reside at
    publicUrl: `https://${process.env.AWS_S3_BUCKET}.s3.amazonaws.com/${objectKey}`
  });
});
```

---

## IAM Configuration

For this to work, the IAM Role assigned to the Node.js API must have the `s3:PutObject` permission, even though Node.js isn't doing the putting. The pre-signed URL inherits the permissions of the IAM Role that generated it.

Furthermore, the S3 Bucket must have a CORS policy allowing uploads from the frontend domain.

```json
[
    {
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["PUT", "POST"],
        "AllowedOrigins": ["https://app.infrawatch.com", "http://localhost:5173"],
        "ExposeHeaders": []
    }
]
```

---

## File Deletion Strategy

When an entity (like an Incident) is hard-deleted, its associated images should be removed from S3 to save costs.

```typescript
// src/utils/s3.ts
export async function deleteS3Object(objectKey: string): Promise<void> {
  try {
    const command = new DeleteObjectCommand({
      Bucket: env.AWS_S3_BUCKET,
      Key: objectKey,
    });
    await s3Client.send(command);
  } catch (error) {
    // Log but don't throw, as the database deletion was likely successful
    console.error(`Failed to delete S3 object: ${objectKey}`, error);
  }
}
```

---

## Related Documents

- **Services:** [Inspection Service](./08-inspection-service.md)
- **Database:** [Inspection Tables](../01-database/08-inspection-tables.md)
- **Index:** [IEKB Master Index](../00-foundation/00-IEKB-index.md)
