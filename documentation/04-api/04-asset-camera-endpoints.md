# Asset & Camera Endpoints

> **IEKB Section:** 04 — API Contracts  
> **Document:** 04-asset-camera-endpoints.md  
> **Last Updated:** 2026-07-16  
> **Owner:** API Architect  
> **Status:** Approved

---

## Assets

### GET /api/v1/assets
Retrieves a paginated list of physical assets, supporting advanced filtering.

**Security:** `JWT` (Any Role)

#### Query Parameters
- `page` (number, default: 1)
- `limit` (number, default: 20)
- `search` (string) - Searches name and description
- `typeId` (number) - Filter by `AssetType`
- `status` (enum: ACTIVE, INACTIVE, MAINTENANCE)
- `sortBy` (string, default: createdAt)
- `sortOrder` (asc/desc)

#### Responses
**200 OK**
```json
{
  "items": [
    {
      "id": 101,
      "name": "Cooling Tower Alpha",
      "status": "ACTIVE",
      "assetType": { "id": 2, "name": "HVAC", "icon": "fan" },
      "_count": { "cameras": 2, "inspections": 1, "incidents": 0 }
    }
  ],
  "total": 45,
  "page": 1,
  "limit": 20,
  "totalPages": 3
}
```

---

### POST /api/v1/assets
Creates a new asset.

**Security:** `JWT` (ADMIN, MANAGER)

#### Request Body
```json
{
  "name": "Cooling Tower Beta",
  "description": "Main campus cooling unit",
  "assetTypeId": 2,
  "latitude": 40.7128,
  "longitude": -74.0060,
  "metadata": {
    "manufacturer": "Trane",
    "installYear": 2024
  }
}
```

#### Responses
**201 Created** (Returns the full created asset object)

---

### GET /api/v1/assets/:id
Retrieves detailed information about a single asset.

**Security:** `JWT` (Any Role)

#### Responses
**200 OK**
```json
{
  "id": 101,
  "name": "Cooling Tower Alpha",
  "description": "...",
  "status": "ACTIVE",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "metadata": { "manufacturer": "Trane" },
  "assetType": { "id": 2, "name": "HVAC" },
  "cameras": [
    { "id": 5, "name": "Cam-Northeast", "status": "ACTIVE" }
  ]
}
```

---

### GET /api/v1/assets/geo
Retrieves all assets within a given radius using Haversine calculation.

**Security:** `JWT` (Any Role)

#### Query Parameters
- `lat` (number, required) - Decimal degrees
- `lng` (number, required) - Decimal degrees
- `radius` (number, required) - Search radius in Kilometers

#### Responses
**200 OK**
```json
[
  {
    "id": 101,
    "name": "Cooling Tower Alpha",
    "latitude": 40.7128,
    "longitude": -74.0060,
    "distance_km": 1.2
  }
]
```

---

## Cameras

### GET /api/v1/cameras
Retrieves a paginated list of cameras.

**Security:** `JWT` (Any Role)

#### Query Parameters
- `page`, `limit`
- `assetId` (number) - Fetch cameras linked to a specific asset
- `status` (enum: ACTIVE, OFFLINE, MAINTENANCE)

#### Responses
**200 OK**
```json
{
  "items": [
    {
      "id": 5,
      "name": "Cam-Northeast",
      "model": "Axis P3245",
      "status": "ACTIVE",
      "lastSeenAt": "2026-07-16T10:05:00Z",
      "asset": { "id": 101, "name": "Cooling Tower Alpha" }
    }
  ],
  "total": 12,
  "page": 1,
  "limit": 20,
  "totalPages": 1
}
```

---

### POST /api/v1/cameras
Registers a new camera.

**Security:** `JWT` (ADMIN, MANAGER)

#### Request Body
```json
{
  "name": "Cam-Northeast",
  "model": "Axis P3245",
  "macAddress": "00:1A:2B:3C:4D:5E",
  "rtspUrl": "rtsp://admin:pass@192.168.1.100:554/stream1",
  "assetId": 101,
  "config": {
    "resolution": "1080p",
    "fps": 30
  }
}
```

#### Responses
**201 Created** (Returns the full created camera object)

---

### PATCH /api/v1/cameras/:id/link
Links or unlinks a camera from an asset.

**Security:** `JWT` (ADMIN, MANAGER)

#### Request Body
```json
{
  "assetId": 105 
}
```
*(Pass `null` to unlink)*

#### Responses
**200 OK** (Returns the updated camera object)

---

## Related Documents

- **Service:** [Asset Service](../03-backend/06-asset-service.md)
- **Service:** [Camera Service](../03-backend/07-camera-service.md)
- **Index:** [IEKB Master Index](../00-foundation/00-IEKB-index.md)
