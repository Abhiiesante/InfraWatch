# Camera Table

> **IEKB Section:** 01 — Database | **Document:** 07-camera-table.md | **Last Updated:** 2026-07-16 | **Status:** Approved

---

## Overview

The `cameras` table stores CCTV, IP cameras, and visual sensor devices registered in InfraWatch. Each camera is optionally linked to an asset and stores connection metadata (RTSP URL, IP address) for V1.1 live streaming and AI inference.

| Property | Value |
|----------|-------|
| **Table Name** | `cameras` |
| **Primary Key** | `id` (SERIAL) |
| **Tenant Scoped** | Yes (`tenant_id`) |
| **Estimated Rows (Year 1)** | 2,000-20,000 |

---

## Schema Definition

```sql
CREATE TABLE "cameras" (
    "id"                SERIAL       PRIMARY KEY,
    "tenant_id"         INTEGER      NOT NULL REFERENCES "organizations"("id") ON DELETE RESTRICT,
    "asset_id"          INTEGER      REFERENCES "assets"("id") ON DELETE SET NULL,
    "name"              VARCHAR(255) NOT NULL,
    "camera_type"       VARCHAR(50)  NOT NULL DEFAULT 'IP',
    "rtsp_url"          TEXT,
    "ip_address"        INET,
    "manufacturer"      VARCHAR(100),
    "model"             VARCHAR(100),
    "resolution"        VARCHAR(20),
    "config"            JSONB        DEFAULT '{}',
    "status"            VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
    "installation_date" DATE,
    "last_seen_at"      TIMESTAMPTZ,
    "created_at"        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    "updated_at"        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT "ck_cameras_valid_type"
        CHECK ("camera_type" IN ('IP', 'ANALOG', 'PTZ', 'THERMAL', 'DRONE', 'OTHER')),
    CONSTRAINT "ck_cameras_valid_status"
        CHECK ("status" IN ('ACTIVE', 'INACTIVE', 'MAINTENANCE', 'OFFLINE'))
);
```

---

## Column Reference

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `SERIAL` | No | Auto | Unique identifier. |
| `tenant_id` | `INTEGER` | No | — | FK to organizations. |
| `asset_id` | `INTEGER` | Yes | `NULL` | FK to assets. Camera may be unlinked from any asset. |
| `name` | `VARCHAR(255)` | No | — | Camera display name (e.g., "Cam-North-T142"). |
| `camera_type` | `VARCHAR(50)` | No | `'IP'` | Type: IP, ANALOG, PTZ, THERMAL, DRONE, OTHER. |
| `rtsp_url` | `TEXT` | Yes | `NULL` | RTSP stream URL (e.g., `rtsp://192.168.1.100:554/stream1`). V1.1 AI uses this. |
| `ip_address` | `INET` | Yes | `NULL` | Camera IP address. PostgreSQL INET type for validation. |
| `manufacturer` | `VARCHAR(100)` | Yes | `NULL` | Camera manufacturer (e.g., "Hikvision", "Dahua"). |
| `model` | `VARCHAR(100)` | Yes | `NULL` | Camera model number. |
| `resolution` | `VARCHAR(20)` | Yes | `NULL` | Resolution string (e.g., "1080p", "4K", "720p"). |
| `config` | `JSONB` | No | `'{}'` | Camera-specific configuration (FoV, rotation, recording schedule). |
| `status` | `VARCHAR(20)` | No | `'ACTIVE'` | Camera status. |
| `installation_date` | `DATE` | Yes | `NULL` | Date camera was installed. |
| `last_seen_at` | `TIMESTAMPTZ` | Yes | `NULL` | Last heartbeat/connectivity check timestamp. |
| `created_at` | `TIMESTAMPTZ` | No | `NOW()` | Creation timestamp. |
| `updated_at` | `TIMESTAMPTZ` | No | `NOW()` | Last update timestamp. |

---

## Config JSONB Examples

```json
// IP Camera with PTZ
{
  "field_of_view_degrees": 120,
  "rotation_angle": 45,
  "night_vision": true,
  "recording_schedule": {
    "start": "18:00",
    "end": "06:00",
    "timezone": "Asia/Kolkata"
  },
  "ptz_preset_positions": [
    { "name": "Entrance", "pan": 0, "tilt": -15, "zoom": 1.5 },
    { "name": "Loading Dock", "pan": 90, "tilt": 0, "zoom": 1.0 }
  ]
}

// Thermal Camera
{
  "temperature_range_celsius": { "min": -20, "max": 350 },
  "alarm_threshold_celsius": 65,
  "emissivity": 0.95,
  "palette": "iron"
}
```

---

## Common Queries

### Create Camera

```typescript
async create(tenantId: number, data: CreateCameraDto): Promise<Camera> {
  if (data.assetId) {
    const asset = await prisma.asset.findFirst({ where: { id: data.assetId, tenantId, deletedAt: null } });
    if (!asset) throw new AppError('ASSET_NOT_FOUND', 'Asset not found', 404);
  }

  return prisma.camera.create({
    data: { tenantId, ...data },
    include: { asset: { select: { id: true, name: true } } },
  });
}
```

### List Cameras by Tenant

```typescript
async list(tenantId: number, options: CameraListOptions): Promise<PaginatedResult<Camera>> {
  const where: Prisma.CameraWhereInput = {
    tenantId,
    ...(options.assetId && { assetId: options.assetId }),
    ...(options.status && { status: options.status }),
    ...(options.type && { cameraType: options.type }),
  };

  const [items, total] = await Promise.all([
    prisma.camera.findMany({
      where, skip: (options.page - 1) * options.limit, take: options.limit,
      orderBy: { createdAt: 'desc' },
      include: { asset: { select: { id: true, name: true } } },
    }),
    prisma.camera.count({ where }),
  ]);

  return { items, total, page: options.page, limit: options.limit, totalPages: Math.ceil(total / options.limit) };
}
```

### Get Cameras by Asset

```typescript
async getByAsset(tenantId: number, assetId: number): Promise<Camera[]> {
  return prisma.camera.findMany({
    where: { tenantId, assetId },
    orderBy: { name: 'asc' },
  });
}
```

### Update Camera Status

```typescript
async updateStatus(tenantId: number, cameraId: number, status: string): Promise<Camera> {
  return prisma.camera.update({
    where: { id: cameraId, tenantId },
    data: { status, ...(status === 'ACTIVE' ? { lastSeenAt: new Date() } : {}) },
  });
}
```

---

## Business Rules

| Rule | Enforcement |
|------|-------------|
| Camera name required | DB NOT NULL + Zod validation |
| Asset must belong to same tenant | Application validation |
| RTSP URL format validated | Zod regex: `rtsp://...` |
| IP address validated | PostgreSQL INET type |
| `last_seen_at` updated on heartbeat | Application logic (future: cron job) |
| Camera type restricted | DB CHECK constraint |
| Unlinked cameras allowed | `asset_id` is nullable |

---

## Seed Data

```typescript
const cameras = [
  { tenantId: 1, assetId: 1, name: 'Cam-North-T142', cameraType: 'IP', rtspUrl: 'rtsp://192.168.1.101:554/stream1', manufacturer: 'Hikvision', model: 'DS-2CD2143G2', resolution: '4MP', status: 'ACTIVE' },
  { tenantId: 1, assetId: 1, name: 'Cam-South-T142', cameraType: 'PTZ', rtspUrl: 'rtsp://192.168.1.102:554/stream1', manufacturer: 'Dahua', model: 'SD49425XB-HNR', resolution: '4MP', status: 'ACTIVE' },
  { tenantId: 1, assetId: 2, name: 'Cam-Entry-T205', cameraType: 'IP', manufacturer: 'Hikvision', resolution: '1080p', status: 'OFFLINE' },
  { tenantId: 2, assetId: 5, name: 'Cam-Array-SP001', cameraType: 'THERMAL', manufacturer: 'FLIR', model: 'A700', resolution: '640x480', status: 'ACTIVE' },
];
```

---

## Related Documents

- **Previous:** [Asset Table](./06-asset-table.md) | **Next:** [Inspection Tables](./08-inspection-tables.md)
- **Service:** [Camera Service](../03-backend/07-camera-service.md) | **API:** [Asset & Camera Endpoints](../04-api/04-asset-camera-endpoints.md)
- **AI:** [Data Pipeline](../12-ai-integration/01-data-pipeline.md) — Camera feeds for V1.1 AI
- **Index:** [IEKB Master Index](../00-foundation/00-IEKB-index.md)

