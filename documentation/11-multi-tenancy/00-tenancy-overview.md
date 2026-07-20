# Multi-Tenancy Overview

> **IEKB Section:** 12 — Multi-Tenancy  
> **Document:** 00-tenancy-overview.md  
> **Last Updated:** 2026-07-16  
> **Owner:** Backend Lead  
> **Status:** Approved

---

## Table of Contents

1. [Architecture Choice](#architecture-choice)
2. [The Tenant Context](#the-tenant-context)
3. [Global vs Tenant Data](#global-vs-tenant-data)
4. [Related Documents](#related-documents)

---

## Architecture Choice

InfraWatch is a B2B SaaS platform. Multiple organizations (Tenants) use the platform simultaneously.

We use a **Shared Database, Shared Schema** architecture. All data for all tenants lives in the exact same PostgreSQL database and tables. Every table that belongs to a tenant has a mandatory `tenantId` foreign key.

**Why not Database-per-Tenant or Schema-per-Tenant?**
- *Pros of Shared:* Easiest to manage migrations, cheapest to run, fastest to onboard new customers.
- *Cons of Shared:* Highest risk of accidental data leakage if a developer forgets to add `WHERE tenantId = ?` to a query.

We mitigate this risk using Prisma Client Extensions (Application-level RLS).

---

## The Tenant Context

Every incoming HTTP request is tied to a Tenant:
1. User authenticates and receives a JWT.
2. The JWT payload contains `tenantId: 5`.
3. The Express Auth Middleware extracts `tenantId` and attaches it to `req.tenantId`.
4. The Controller extracts `req.tenantId` and passes it as the *first argument* to every Service layer function.

```typescript
// Controller Example
async getAsset(req: Request, res: Response) {
  const asset = await AssetService.findById(req.tenantId, req.params.id);
  res.json(asset);
}
```

---

## Global vs Tenant Data

Not all tables belong to a tenant.

- **Global Tables:** `Organization`, `FeatureToggle`, `AdminUser`. These are system-wide and do not have a `tenantId`.
- **Tenant Tables:** `User`, `Asset`, `Camera`, `Inspection`, `Incident`. These MUST have a `tenantId` and a compound unique constraint (e.g., `@@unique([tenantId, email])` for Users).

---

## Related Documents

- **Implementation:** [Prisma RLS Extensions](./01-prisma-rls-extensions.md)
- **Database:** [Database Schema](../01-database/00-schema-design.md)
- **Index:** [IEKB Master Index](../00-foundation/00-IEKB-index.md)
