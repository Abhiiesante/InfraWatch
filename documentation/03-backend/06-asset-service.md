# Asset Service

> **IEKB Section:** 03 — Backend  
> **Document:** 06-asset-service.md  
> **Last Updated:** 2026-07-16  
> **Owner:** Backend Lead  
> **Status:** Approved

---

## Table of Contents

1. [Overview](#overview)
2. [Service Implementation](#service-implementation)
3. [Geo-Spatial Querying](#geo-spatial-querying)
4. [JSONB Metadata Handling](#jsonb-metadata-handling)
5. [Related Documents](#related-documents)

---

## Overview

The `AssetService` manages the core entity of InfraWatch: physical infrastructure assets. It handles complex filtering (status, type, search), geo-spatial queries, JSONB metadata validation, and soft deletion logic.

---

## Service Implementation

```typescript
// src/modules/assets/asset.service.ts
import { prisma } from '@/config/prisma';
import { AppError } from '@/utils/errors';
import type { Prisma } from '@prisma/client';
import type { CreateAssetDto, AssetListOptions } from './asset.schema';

export class AssetService {

  /**
   * Retrieves a paginated list of assets with optional filtering.
   */
  async list(tenantId: number, options: AssetListOptions) {
    const { page = 1, limit = 20, search, typeId, status } = options;
    const skip = (page - 1) * limit;

    // tenantId is included explicitly (belt-and-suspenders). The Prisma extension
    // also auto-injects it, and Postgres RLS enforces it independently — but we never
    // rely on the auto-injection alone in a list query. See:
    // ../11-multi-tenancy/01-prisma-rls-extensions.md
    const where: Prisma.AssetWhereInput = {
      tenantId,
      deletedAt: null, // Always exclude soft-deleted
      ...(search && { name: { contains: search, mode: 'insensitive' } }),
      ...(typeId && { assetTypeId: typeId }),
      ...(status && { status }),
    };

    const [items, total] = await Promise.all([
      prisma.asset.findMany({
        where, skip, take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          assetType: { select: { id: true, name: true, icon: true } },
          // Count relations for dashboard displays
          _count: { select: { cameras: true, inspections: true, incidents: { where: { status: 'OPEN' } } } }
        }
      }),
      prisma.asset.count({ where })
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /**
   * Creates a new asset and validates the asset type.
   */
  async create(tenantId: number, userId: number, data: CreateAssetDto) {
    // Validate that the requested assetType belongs to this tenant
    if (data.assetTypeId) {
      const type = await prisma.assetType.findFirst({
        where: { id: data.assetTypeId, tenantId }
      });
      if (!type) throw new AppError('NOT_FOUND', 'Asset type not found', 404);
    }

    return prisma.asset.create({
      data: {
        tenantId,
        createdById: userId,
        ...data,
        metadata: data.metadata || {},
      },
      include: { assetType: true }
    });
  }

  /**
   * Soft deletes an asset.
   */
  async delete(tenantId: number, assetId: number) {
    const asset = await prisma.asset.findFirst({
      where: { id: assetId, tenantId, deletedAt: null },
      include: { _count: { select: { inspections: true, incidents: true } } }
    });

    if (!asset) throw new AppError('NOT_FOUND', 'Asset not found', 404);

    // Soft delete logic
    return prisma.asset.update({
      where: { id: assetId },
      data: { 
        deletedAt: new Date(), 
        status: 'DECOMMISSIONED' 
      }
    });
  }
}

export const assetService = new AssetService();
```

---

## Geo-Spatial Querying

Since Prisma does not natively support PostGIS or complex math in `findMany`, geo-spatial queries (e.g., "Find assets within 10km") must drop down to raw SQL using `$queryRaw`.

```typescript
/**
 * Finds assets within a specific radius (in km) using the Haversine formula.
 */
async findNearLocation(tenantId: number, lat: number, lng: number, radiusKm: number) {
  // We MUST explicitly include tenant_id here because Prisma Extensions 
  // do not automatically parse and inject into $queryRaw strings!
  const assets = await prisma.$queryRaw`
    SELECT id, name, latitude, longitude,
      (6371 * acos(
        cos(radians(${lat})) * cos(radians(latitude)) *
        cos(radians(longitude) - radians(${lng})) +
        sin(radians(${lat})) * sin(radians(latitude))
      )) AS distance_km
    FROM assets
    WHERE tenant_id = ${tenantId}
      AND deleted_at IS NULL
      AND latitude IS NOT NULL
      AND longitude IS NOT NULL
    HAVING (6371 * acos(
        cos(radians(${lat})) * cos(radians(latitude)) *
        cos(radians(longitude) - radians(${lng})) +
        sin(radians(${lat})) * sin(radians(latitude))
      )) < ${radiusKm}
    ORDER BY distance_km;
  `;

  return assets;
}
```

> [!WARNING]
> Always pass variables into `$queryRaw` using template literals `${var}`. Prisma translates these into parameterized SQL queries (`$1`, `$2`), protecting against SQL injection. Never concatenate strings into a raw query.

---

## JSONB Metadata Handling

The `metadata` field allows tenants to store arbitrary unstructured data. To update a specific key within the JSONB object without overwriting the entire object, we must use Prisma's `DbNull` / `JsonNull` features or raw SQL for deep merges.

For V0, we use a simpler overwrite approach: we fetch the existing metadata, merge it in Node.js, and save it back.

```typescript
async updateMetadata(tenantId: number, assetId: number, newMetadata: Record<string, any>) {
  const asset = await prisma.asset.findFirst({
    where: { id: assetId, tenantId }
  });
  
  if (!asset) throw new AppError('NOT_FOUND', 'Asset not found', 404);

  // Merge existing metadata with new values
  const mergedMetadata = {
    ...(asset.metadata as Record<string, any>),
    ...newMetadata
  };

  return prisma.asset.update({
    where: { id: assetId },
    data: { metadata: mergedMetadata }
  });
}
```

---

## Related Documents

- **Database:** [Asset Table](../01-database/06-asset-table.md)
- **API:** [Asset & Camera Endpoints](../04-api/04-asset-camera-endpoints.md)
- **Frontend:** [Asset Management Pages](../05-frontend/06-asset-management-pages.md)
- **Index:** [IEKB Master Index](../00-foundation/00-IEKB-index.md)
