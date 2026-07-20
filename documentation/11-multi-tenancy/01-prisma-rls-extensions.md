# Prisma RLS Extensions (Application Level)

> **IEKB Section:** 12 — Multi-Tenancy  
> **Document:** 01-prisma-rls-extensions.md  
> **Last Updated:** 2026-07-16  
> **Owner:** Backend Lead  
> **Status:** Approved

---

## Table of Contents

1. [The Problem with Shared DBs](#the-problem-with-shared-dbs)
2. [Prisma Client Extensions](#prisma-client-extensions)
3. [Implementation](#implementation)
4. [Related Documents](#related-documents)

---

## The Problem with Shared DBs

If developer writes:
```typescript
prisma.incident.findMany({ where: { status: 'OPEN' } });
```
This query returns *all open incidents for all organizations in the database*. This is a catastrophic data leak.

We must enforce that `tenantId` is always appended to the `where` clause. PostgreSQL has built-in Row-Level Security (RLS), but integrating it with connection poolers (like PgBouncer) in Node.js is notoriously complex. Instead, we use **Application-Level RLS via Prisma Client Extensions**.

---

## Prisma Client Extensions

Prisma allows us to create extended client instances that intercept queries before they are sent to the database. We can write a factory function that takes a `tenantId` and returns a modified Prisma client that *automatically* appends `tenantId` to all operations (find, update, delete).

---

## Implementation

```typescript
// src/config/prisma.ts
import { PrismaClient, Prisma } from '@prisma/client';

export const prisma = new PrismaClient();

// Define models that belong to a tenant
const tenantModels = ['Asset', 'Camera', 'Inspection', 'Incident', 'User'] as const;
type TenantModel = typeof tenantModels[number];

/**
 * Returns a Prisma Client securely scoped to a specific Tenant ID.
 */
export function getTenantPrisma(tenantId: number) {
  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          // If this model doesn't belong to a tenant (e.g. Organization), execute normally
          if (!tenantModels.includes(model as TenantModel)) {
            return query(args);
          }

          // Intercept queries and force the tenantId into the WHERE clause
          if (['findUnique', 'findFirst', 'findMany', 'update', 'updateMany', 'delete', 'deleteMany'].includes(operation)) {
            args.where = { ...args.where, tenantId };
          }
          
          // Intercept creates and force the tenantId into the data payload
          if (['create', 'createMany'].includes(operation)) {
             if (Array.isArray((args as any).data)) {
               (args as any).data = (args as any).data.map((d: any) => ({ ...d, tenantId }));
             } else {
               args.data = { ...args.data, tenantId };
             }
          }

          return query(args);
        },
      },
    },
  });
}
```

### Usage in Services

```typescript
import { getTenantPrisma } from '@/config/prisma';

export class AssetService {
  static async getAssets(tenantId: number) {
    const db = getTenantPrisma(tenantId);
    
    // SAFE: This will automatically be rewritten to include `where: { tenantId }`
    return db.asset.findMany(); 
  }
}
```

---

## Related Documents

- **Architecture:** [Tenancy Overview](./00-tenancy-overview.md)
- **Database:** [Prisma Setup](../01-database/01-prisma-setup.md)
- **Index:** [IEKB Master Index](../00-foundation/00-IEKB-index.md)
