# Organization Table

> **IEKB Section:** 01 — Database  
> **Document:** 03-organization-table.md  
> **Last Updated:** 2026-07-16  
> **Owner:** Database Engineer  
> **Status:** Approved

---

## Table of Contents

1. [Overview](#overview)
2. [Schema Definition](#schema-definition)
3. [Column Reference](#column-reference)
4. [Constraints & Indexes](#constraints--indexes)
5. [Prisma Model](#prisma-model)
6. [Common Queries](#common-queries)
7. [Business Rules](#business-rules)
8. [Seed Data](#seed-data)
9. [Related Documents](#related-documents)

---

## Overview

The `organizations` table represents **tenants** in InfraWatch's multi-tenant architecture. Each organization is a company that subscribes to InfraWatch. All other data (users, assets, incidents, etc.) is scoped to an organization via the `tenant_id` foreign key.

| Property | Value |
|----------|-------|
| **Table Name** | `organizations` |
| **Primary Key** | `id` (SERIAL) |
| **Tenant Scoped** | No (IS the tenant) |
| **Soft Delete** | No (deactivate via `is_active`) |
| **Estimated Rows (Year 1)** | 50-500 |
| **RLS Enabled** | No (organizations are the tenant boundary) |

---

## Schema Definition

```sql
CREATE TABLE "organizations" (
    "id"          SERIAL       PRIMARY KEY,
    "name"        VARCHAR(255) NOT NULL,
    "domain"      VARCHAR(255) UNIQUE,
    "plan"        VARCHAR(50)  NOT NULL DEFAULT 'STARTER',
    "logo_url"    TEXT,
    "is_active"   BOOLEAN      NOT NULL DEFAULT true,
    "created_at"  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    "updated_at"  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT "ck_organizations_valid_plan"
        CHECK ("plan" IN ('STARTER', 'PROFESSIONAL', 'ENTERPRISE'))
);
```

---

## Column Reference

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `SERIAL` | No | Auto-increment | Unique identifier. Used as `tenant_id` in all other tables. |
| `name` | `VARCHAR(255)` | No | — | Organization display name (e.g., "TowerNet Communications"). |
| `domain` | `VARCHAR(255)` | Yes | `NULL` | Unique domain for SSO/branding (e.g., "towernet.com"). Nullable for non-SSO tenants. |
| `plan` | `VARCHAR(50)` | No | `'STARTER'` | Subscription tier. Determines feature limits and pricing. |
| `logo_url` | `TEXT` | Yes | `NULL` | URL to the organization's logo in S3. Used in branding. |
| `is_active` | `BOOLEAN` | No | `true` | Whether the organization is active. Set to `false` to disable all access. |
| `created_at` | `TIMESTAMPTZ` | No | `NOW()` | Timestamp of organization creation. |
| `updated_at` | `TIMESTAMPTZ` | No | `NOW()` | Timestamp of last update. Auto-updated by trigger. |

---

## Constraints & Indexes

### Constraints

| Name | Type | Definition | Purpose |
|------|------|-----------|---------|
| `organizations_pkey` | Primary Key | `(id)` | Unique identifier |
| `organizations_domain_key` | Unique | `(domain)` | Prevent duplicate domains |
| `ck_organizations_valid_plan` | Check | `plan IN ('STARTER', 'PROFESSIONAL', 'ENTERPRISE')` | Valid subscription tiers |

### Indexes

| Name | Columns | Type | Purpose |
|------|---------|------|---------|
| `idx_organizations_domain` | `(domain)` | B-tree | SSO domain lookup |
| `idx_organizations_is_active` | `(is_active)` where `is_active = true` | Partial B-tree | Fast active org filtering |

---

## Prisma Model

```prisma
model Organization {
  id        Int      @id @default(autoincrement())
  name      String   @db.VarChar(255)
  domain    String?  @unique @db.VarChar(255)
  plan      String   @default("STARTER") @db.VarChar(50)
  logoUrl   String?  @map("logo_url")
  isActive  Boolean  @default(true) @map("is_active")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  users       User[]
  assetTypes  AssetType[]
  assets      Asset[]
  cameras     Camera[]
  inspections Inspection[]
  incidents   Incident[]
  reports     Report[]
  settings    OrgSettings?
  auditLogs   AuditLog[]

  @@map("organizations")
}
```

---

## Common Queries

### Create Organization

```typescript
// Service layer
async createOrganization(data: CreateOrgDto): Promise<Organization> {
  return prisma.organization.create({
    data: {
      name: data.name,
      domain: data.domain,
      plan: data.plan || 'STARTER',
      settings: {
        create: {
          timezone: data.timezone || 'UTC',
        },
      },
    },
    include: { settings: true },
  });
}
```

```sql
-- Raw SQL equivalent
INSERT INTO organizations (name, domain, plan)
VALUES ('TowerNet Communications', 'towernet.com', 'PROFESSIONAL')
RETURNING *;

-- Also create org settings
INSERT INTO org_settings (tenant_id, timezone)
VALUES (currval('organizations_id_seq'), 'Asia/Kolkata');
```

### Get Organization by ID

```typescript
async getById(orgId: number): Promise<Organization | null> {
  return prisma.organization.findUnique({
    where: { id: orgId },
    include: {
      settings: true,
      _count: {
        select: {
          users: true,
          assets: true,
          cameras: true,
        },
      },
    },
  });
}
```

### Get Organization by Domain (SSO Lookup)

```typescript
async getByDomain(domain: string): Promise<Organization | null> {
  return prisma.organization.findUnique({
    where: { domain },
  });
}
```

```sql
SELECT * FROM organizations WHERE domain = 'towernet.com';
```

### List Active Organizations (Admin)

```typescript
async listActive(page: number, limit: number) {
  const [items, total] = await Promise.all([
    prisma.organization.findMany({
      where: { isActive: true },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { users: true, assets: true } },
      },
    }),
    prisma.organization.count({ where: { isActive: true } }),
  ]);
  return { items, total, page, limit };
}
```

### Update Organization

```typescript
async update(orgId: number, data: UpdateOrgDto): Promise<Organization> {
  return prisma.organization.update({
    where: { id: orgId },
    data: {
      name: data.name,
      domain: data.domain,
      plan: data.plan,
      logoUrl: data.logoUrl,
    },
  });
}
```

### Deactivate Organization

```typescript
async deactivate(orgId: number): Promise<void> {
  await prisma.$transaction([
    // Deactivate all users
    prisma.user.updateMany({
      where: { tenantId: orgId },
      data: { isActive: false },
    }),
    // Deactivate the organization
    prisma.organization.update({
      where: { id: orgId },
      data: { isActive: false },
    }),
  ]);
}
```

### Organization Statistics (Dashboard)

```sql
SELECT 
  o.id,
  o.name,
  o.plan,
  o.created_at,
  COUNT(DISTINCT u.id) AS user_count,
  COUNT(DISTINCT a.id) AS asset_count,
  COUNT(DISTINCT c.id) AS camera_count,
  COUNT(DISTINCT i.id) FILTER (WHERE i.status = 'OPEN') AS open_incidents
FROM organizations o
LEFT JOIN users u ON u.tenant_id = o.id AND u.is_active = true
LEFT JOIN assets a ON a.tenant_id = o.id AND a.deleted_at IS NULL
LEFT JOIN cameras c ON c.tenant_id = o.id
LEFT JOIN incidents i ON i.tenant_id = o.id AND i.deleted_at IS NULL
WHERE o.is_active = true
GROUP BY o.id
ORDER BY o.created_at DESC;
```

---

## Business Rules

| Rule | Description | Enforcement |
|------|-------------|-------------|
| **Unique domain** | No two organizations can have the same domain | Database UNIQUE constraint |
| **Valid plan** | Plan must be one of STARTER, PROFESSIONAL, ENTERPRISE | Database CHECK constraint |
| **Cannot delete with data** | Organizations with users or assets cannot be deleted | Foreign key RESTRICT |
| **Deactivation cascades** | Deactivating an org deactivates all its users | Application logic (transaction) |
| **Settings auto-created** | Every org gets an `org_settings` record on creation | Application logic |
| **Domain format** | Domain must be a valid domain name (lowercase, no protocol) | Zod validation |

---

## Seed Data

```typescript
// Development seed data
const organizations = [
  {
    name: 'TowerNet Communications',
    domain: 'towernet.com',
    plan: 'PROFESSIONAL',
  },
  {
    name: 'SolarPower India',
    domain: 'solarpower.in',
    plan: 'ENTERPRISE',
  },
  {
    name: 'BuildFast Construction',
    domain: 'buildfastco.com',
    plan: 'STARTER',
  },
];
```

---

## Related Documents

- **Previous:** [Migration V001](./02-migration-V001-baseline.md)
- **Next:** [User Table](./04-user-table.md)
- **Multi-Tenancy:** [Tenancy Overview](../11-multi-tenancy/00-tenancy-overview.md)
- **Provisioning:** [Tenant Provisioning](../11-multi-tenancy/02-tenant-provisioning.md)
- **Service:** [Organization Service](../03-backend/04-org-service.md)
- **API:** [Org & User Endpoints](../04-api/03-org-user-endpoints.md)
- **Index:** [IEKB Master Index](../00-foundation/00-IEKB-index.md)

