# Asset Type Table

> **IEKB Section:** 01 — Database | **Document:** 05-asset-type-table.md | **Last Updated:** 2026-07-16 | **Status:** Approved

---

## Overview

The `asset_types` table stores configurable asset categories per tenant. Each tenant can define their own asset types (e.g., "Cellular Tower", "Solar Panel", "Pump Station") to categorize their physical infrastructure.

| Property | Value |
|----------|-------|
| **Table Name** | `asset_types` |
| **Primary Key** | `id` (SERIAL) |
| **Tenant Scoped** | Yes (`tenant_id`) |
| **Estimated Rows** | 500-2,500 (5-10 types per tenant) |

---

## Schema Definition

```sql
CREATE TABLE "asset_types" (
    "id"          SERIAL       PRIMARY KEY,
    "tenant_id"   INTEGER      NOT NULL REFERENCES "organizations"("id") ON DELETE RESTRICT,
    "name"        VARCHAR(100) NOT NULL,
    "description" TEXT,
    "icon"        VARCHAR(50),
    "is_active"   BOOLEAN      NOT NULL DEFAULT true,
    "created_at"  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    "updated_at"  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT "uq_asset_types_tenant_id_name" UNIQUE ("tenant_id", "name")
);

CREATE INDEX "idx_asset_types_tenant_id" ON "asset_types" ("tenant_id");
```

---

## Column Reference

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `SERIAL` | No | Auto-increment | Unique identifier. |
| `tenant_id` | `INTEGER` | No | — | FK to `organizations.id`. |
| `name` | `VARCHAR(100)` | No | — | Type name (e.g., "Cellular Tower"). Unique per tenant. |
| `description` | `TEXT` | Yes | `NULL` | Optional description of this asset type. |
| `icon` | `VARCHAR(50)` | Yes | `NULL` | Icon identifier for UI display (e.g., "tower", "solar-panel"). |
| `is_active` | `BOOLEAN` | No | `true` | Whether this type is available for new assets. |
| `created_at` | `TIMESTAMPTZ` | No | `NOW()` | Creation timestamp. |
| `updated_at` | `TIMESTAMPTZ` | No | `NOW()` | Last update timestamp. |

---

## Common Queries

### List Active Types for Tenant

```typescript
async listByTenant(tenantId: number): Promise<AssetType[]> {
  return prisma.assetType.findMany({
    where: { tenantId, isActive: true },
    orderBy: { name: 'asc' },
    include: { _count: { select: { assets: true } } },
  });
}
```

### Create Asset Type

```typescript
async create(tenantId: number, data: CreateAssetTypeDto): Promise<AssetType> {
  return prisma.assetType.create({
    data: { tenantId, name: data.name, description: data.description, icon: data.icon },
  });
}
```

### Deactivate (Prevents Use for New Assets)

```typescript
async deactivate(tenantId: number, typeId: number): Promise<AssetType> {
  return prisma.assetType.update({
    where: { id: typeId, tenantId },
    data: { isActive: false },
  });
}
```

---

## Business Rules

| Rule | Enforcement |
|------|-------------|
| Name unique per tenant | DB UNIQUE constraint `(tenant_id, name)` |
| Cannot delete types with existing assets | FK RESTRICT on `assets.asset_type_id` → deactivate instead |
| Default types created on org signup | Application logic in tenant provisioning |

---

## Seed Data

```typescript
const assetTypes = [
  // TowerNet
  { tenantId: 1, name: 'Cellular Tower', icon: 'tower', description: 'Mobile network towers' },
  { tenantId: 1, name: 'Fiber Node', icon: 'network', description: 'Fiber optic network nodes' },
  { tenantId: 1, name: 'Data Center', icon: 'server', description: 'Data center facilities' },
  // SolarPower
  { tenantId: 2, name: 'Solar Panel Array', icon: 'sun', description: 'Photovoltaic panel arrays' },
  { tenantId: 2, name: 'Inverter Station', icon: 'zap', description: 'Power inverter stations' },
  { tenantId: 2, name: 'Battery Storage', icon: 'battery', description: 'Energy storage systems' },
  // BuildFast
  { tenantId: 3, name: 'Crane', icon: 'crane', description: 'Construction cranes' },
  { tenantId: 3, name: 'Scaffolding', icon: 'layers', description: 'Scaffolding structures' },
  { tenantId: 3, name: 'Generator', icon: 'power', description: 'Diesel generators' },
];
```

---

## Related Documents

- **Previous:** [User Table](./04-user-table.md) | **Next:** [Asset Table](./06-asset-table.md)
- **Service:** [Asset Service](../03-backend/06-asset-service.md) | **Index:** [IEKB Master Index](../00-foundation/00-IEKB-index.md)
