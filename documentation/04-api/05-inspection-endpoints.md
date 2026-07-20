# Inspection Endpoints

> **IEKB Section:** 04 — API Contracts  
> **Document:** 05-inspection-endpoints.md  
> **Last Updated:** 2026-07-16  
> **Owner:** API Architect  
> **Status:** Approved

---

## Table of Contents

1. [Inspection Core Endpoints](#inspection-core-endpoints)
2. [Image Upload Workflow](#image-upload-workflow)
3. [Related Documents](#related-documents)

---

## Inspection Core Endpoints

### GET /api/v1/inspections
Retrieves a paginated list of scheduled or completed inspections.

**Security:** `JWT` (Any Role)

#### Query Parameters
- `page`, `limit`
- `assetId` (number)
- `inspectorId` (number) - Fetch inspections assigned to a specific user
- `status` (enum: SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED, OVERDUE)
- `startDate` / `endDate` (ISO 8601 Strings)

#### Responses
**200 OK**
```json
{
  "items": [
    {
      "id": 540,
      "asset": { "id": 101, "name": "Cooling Tower Alpha" },
      "inspector": { "id": 2, "name": "Rajesh Patel" },
      "scheduledDate": "2026-07-20T09:00:00Z",
      "status": "SCHEDULED"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20,
  "totalPages": 1
}
```

---

### POST /api/v1/inspections
Schedules a new inspection.

**Security:** `JWT` (ADMIN, MANAGER)

#### Request Body
```json
{
  "assetId": 101,
  "inspectorId": 2,
  "scheduledDate": "2026-07-20T09:00:00Z"
}
```

#### Responses
**201 Created** (Returns the full created inspection object)

---

### POST /api/v1/inspections/:id/complete
Action endpoint to mark an inspection as completed. Updates the parent asset status if requested.

**Security:** `JWT` (Any Role, but Inspectors can only complete their own assignments)

#### Request Body
```json
{
  "notes": "Visual inspection passed. No leaks detected.",
  "updateAssetStatusTo": "ACTIVE"
}
```

#### Responses
**200 OK**
```json
{
  "id": 540,
  "status": "COMPLETED",
  "completedAt": "2026-07-20T09:15:00Z",
  "notes": "Visual inspection passed. No leaks detected."
}
```

**403 Forbidden** (If Inspector attempts to complete someone else's assignment)
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "You can only complete inspections assigned to you"
  }
}
```

---

## Image Upload Workflow

Handling inspection images requires a two-step API flow to bypass Node.js streaming and upload directly to S3.

### 1. POST /api/v1/inspections/:id/images/upload-url
Requests a pre-signed S3 URL for uploading an image.

**Security:** `JWT` (Any Role)

#### Request Body
```json
{
  "filename": "crack-detail.jpg",
  "mimeType": "image/jpeg"
}
```

#### Responses
**200 OK**
```json
{
  "uploadUrl": "https://s3.amazonaws.com/infrawatch-bucket/inspections/1/540/original/uuid.jpg?X-Amz-Algorithm=...",
  "objectKey": "inspections/1/540/original/uuid.jpg",
  "publicUrl": "https://infrawatch-bucket.s3.amazonaws.com/inspections/1/540/original/uuid.jpg"
}
```
*(The frontend now makes a PUT request directly to `uploadUrl` with the binary file).*

---

### 2. POST /api/v1/inspections/:id/images/confirm
Confirms the client successfully uploaded the file to S3, triggering the database insert and thumbnail generation job.

**Security:** `JWT` (Any Role)

#### Request Body
```json
{
  "objectKey": "inspections/1/540/original/uuid.jpg"
}
```

#### Responses
**201 Created**
```json
{
  "id": 1050,
  "inspectionId": 540,
  "imageUrl": "https://infrawatch-bucket.s3.amazonaws.com/inspections/1/540/original/uuid.jpg",
  "thumbnailUrl": null,
  "createdAt": "2026-07-20T09:10:00Z"
}
```
*(Note: `thumbnailUrl` will be null until the background worker processes the image. The frontend should use the `imageUrl` in the meantime).*

---

## Related Documents

- **Service:** [Inspection Service](../03-backend/08-inspection-service.md)
- **Service:** [File Upload Service](../03-backend/12-file-upload-service.md)
- **Index:** [IEKB Master Index](../00-foundation/00-IEKB-index.md)
