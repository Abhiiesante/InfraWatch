# Inspection Pages & Image Uploads

> **IEKB Section:** 05 — Frontend  
> **Document:** 08-inspection-pages.md  
> **Last Updated:** 2026-07-16  
> **Owner:** Frontend Lead  
> **Status:** Approved

---

## Table of Contents

1. [Overview](#overview)
2. [Mobile-First Form Design](#mobile-first-form-design)
3. [Direct-to-S3 Image Upload Implementation](#direct-to-s3-image-upload-implementation)
4. [Related Documents](#related-documents)

---

## Overview

The Inspection feature is heavily utilized by `INSPECTOR` roles in the field, often on tablets or mobile devices. Therefore, the Inspection Completion views must be rigorously designed with a **Mobile-First** approach.

---

## Mobile-First Form Design

When an inspector is completing an inspection (`/inspections/:id/execute`), the UI should present a clean, easily tappable interface.

- Avoid dense tables.
- Use large touch targets (minimum 44x44px for buttons).
- Use native file inputs for camera integration (`<input type="file" accept="image/*" capture="environment" />`).

```tsx
// src/features/inspections/components/InspectionExecuteForm.tsx
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

export const InspectionExecuteForm = ({ inspectionId, onSubmit }) => {
  const { register, handleSubmit } = useForm();

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-2">
        <label className="text-sm font-medium">Notes / Findings</label>
        <Textarea 
          {...register('notes')} 
          className="min-h-[150px] text-base" // text-base prevents iOS Safari from zooming in on focus
          placeholder="Describe any issues found..." 
        />
      </div>
      
      {/* Action buttons span full width on mobile */}
      <Button type="submit" className="w-full h-12 text-lg">
        Complete Inspection
      </Button>
    </form>
  );
};
```

---

## Direct-to-S3 Image Upload Implementation

Uploading images requires orchestrating a two-step API flow to avoid bottlenecking the Node.js backend.

### The Uploader Hook

We abstract the complex upload logic into a custom React Query mutation hook.

```typescript
// src/features/inspections/api/useUploadImage.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { api } from '@/lib/api';

export const useUploadImage = (inspectionId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      // Step 1: Ask backend for a pre-signed S3 URL
      const { data: presigned } = await api.post(`/v1/inspections/${inspectionId}/images/upload-url`, {
        filename: file.name,
        mimeType: file.type
      });

      // Step 2: Upload file directly to S3 using standard Axios (NOT our `api` instance)
      // We don't want to send our JWT or custom headers to S3
      await axios.put(presigned.uploadUrl, file, {
        headers: {
          'Content-Type': file.type,
          // Must match the ACL requested by the backend when generating the URL
          'x-amz-acl': 'public-read' 
        }
      });

      // Step 3: Tell backend the upload finished successfully
      const { data: record } = await api.post(`/v1/inspections/${inspectionId}/images/confirm`, {
        objectKey: presigned.objectKey
      });

      return record;
    },
    onSuccess: () => {
      // Invalidate the inspection data to show the new image
      queryClient.invalidateQueries({ queryKey: ['inspection', inspectionId] });
    }
  });
};
```

### The Component UI

```tsx
// src/features/inspections/components/ImageUploader.tsx
import { useState } from 'react';
import { useUploadImage } from '../api/useUploadImage';
import { Button } from '@/components/ui/button';
import { Camera } from 'lucide-react';

export const ImageUploader = ({ inspectionId }) => {
  const uploadMutation = useUploadImage(inspectionId);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show instant local preview while uploading
    setPreview(URL.createObjectURL(file));

    uploadMutation.mutate(file, {
      onSuccess: () => {
        setPreview(null); // Clear preview, React Query will load the real image
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Hidden file input invoked via label click */}
      <label className="block w-full cursor-pointer">
        <input 
          type="file" 
          accept="image/*" 
          capture="environment" 
          className="hidden" 
          onChange={handleFileChange}
        />
        <div className="flex items-center justify-center w-full h-32 border-2 border-dashed border-primary/50 rounded-lg bg-primary/5 hover:bg-primary/10 transition">
          <div className="flex flex-col items-center">
            <Camera className="w-8 h-8 text-primary mb-2" />
            <span className="text-sm font-medium text-primary">Take Photo</span>
          </div>
        </div>
      </label>

      {/* Upload State Feedback */}
      {uploadMutation.isLoading && (
        <div className="flex items-center space-x-4 p-4 border rounded-lg animate-pulse">
          <div className="w-16 h-16 bg-muted rounded object-cover overflow-hidden">
            {preview && <img src={preview} alt="uploading" className="w-full h-full opacity-50" />}
          </div>
          <div className="text-sm text-muted-foreground">Uploading to secure storage...</div>
        </div>
      )}
    </div>
  );
};
```

---

## Related Documents

- **Backend Service:** [Inspection Service](../03-backend/08-inspection-service.md)
- **Backend Service:** [File Upload Service](../03-backend/12-file-upload-service.md)
- **API Contracts:** [Inspection Endpoints](../04-api/05-inspection-endpoints.md)
- **Index:** [IEKB Master Index](../00-foundation/00-IEKB-index.md)
