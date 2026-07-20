# Tenant Context in Authentication

> **IEKB Section:** 02 — Auth  
> **Document:** 04-tenant-context.md  
> **Last Updated:** 2026-07-16  
> **Owner:** Backend Lead / Security Engineer  
> **Status:** Approved

---

## Table of Contents

1. [The Challenge of Multi-Tenancy](#the-challenge-of-multi-tenancy)
2. [Tenant Context Extraction](#tenant-context-extraction)
3. [Express Request Augmentation](#express-request-augmentation)
4. [Service Layer Consumption](#service-layer-consumption)
5. [Prisma Client Extension (Advanced Isolation)](#prisma-client-extension-advanced-isolation)
6. [Cross-Tenant Operations](#cross-tenant-operations)
7. [Related Documents](#related-documents)

---

## The Challenge of Multi-Tenancy

In a shared database architecture, the single most critical security vulnerability is data leakage between tenants (Organization A seeing Organization B's assets). 

To prevent this, InfraWatch guarantees that **every authenticated request is intrinsically bound to a single `tenantId`**. This `tenantId` is never trusted from the client's HTTP payload (body/query/params); it is always securely extracted from the cryptographically verified JWT.

---

## Tenant Context Extraction

### The Tenant Middleware

After the `authMiddleware` verifies the JWT, the `tenantMiddleware` extracts the tenant information and constructs a strict `TenantContext` object.

```typescript
// src/middleware/tenant.ts
import { Request, Response, NextFunction } from 'express';
import { AppError } from '@/utils/errors';
import type { TenantContext } from '@/types/context';

export const tenantMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Ensure auth middleware has run
  if (!req.user) {
    return next(new AppError('UNAUTHORIZED', 'Authentication required before tenant extraction', 401));
  }

  const { tenantId, sub: userId, role } = req.user;

  if (!tenantId) {
    return next(new AppError('FORBIDDEN', 'User is not associated with a tenant', 403));
  }

  // Attach context to request
  req.tenantContext = {
    tenantId,
    userId,
    userRole: role,
  };

  // NOTE: This snippet shows only context extraction. The production middleware wraps
  // the rest of the request in `withTenantTransaction(tenantId, ...)`, which both
  // populates AsyncLocalStorage (app-level scoping) and sets `app.current_tenant_id`
  // (database-level RLS). See "Wrapping Requests in AsyncLocalStorage" below and the
  // canonical implementation: ../11-multi-tenancy/01-prisma-rls-extensions.md
  next();
};
```

---

## Express Request Augmentation

To make TypeScript aware of `req.tenantContext`, we augment the global Express namespace.

```typescript
// src/types/express.d.ts
import { TokenPayload } from '@/utils/jwt';
import { TenantContext } from '@/types/context';

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
      tenantContext: TenantContext; // Only available after tenantMiddleware
    }
  }
}

// src/types/context.ts
export interface TenantContext {
  tenantId: number;
  userId: number;
  userRole: string;
}
```

---

## Service Layer Consumption

Controllers extract the `tenantContext` and pass `tenantId` explicitly as the **first parameter** to every Service method.

### The Controller

```typescript
// src/controllers/asset.controller.ts
class AssetController {
  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // 1. Extract context safely
      const { tenantId, userId } = req.tenantContext;
      
      // 2. Extract validated payload
      const payload = req.body; 
      
      // 3. Pass tenantId FIRST to the service
      const asset = await assetService.create(tenantId, userId, payload);
      
      res.status(201).json(asset);
    } catch (error) {
      next(error);
    }
  };
}
```

### The Service

```typescript
// src/services/asset.service.ts
class AssetService {
  // tenantId is ALWAYS the first argument
  async create(tenantId: number, userId: number, data: CreateAssetDto) {
    return prisma.asset.create({
      data: {
        ...data,
        tenantId, // Explicitly injected here
        createdById: userId,
      },
    });
  }

  async findById(tenantId: number, assetId: number) {
    return prisma.asset.findFirst({
      where: {
        id: assetId,
        tenantId, // Explicitly filtered here
        deletedAt: null
      }
    });
  }
}
```

---

## Prisma Client Extension (Advanced Isolation)

While explicitly passing `tenantId` is good practice, human error (forgetting to add `tenantId` to a `where` clause) can cause data leaks. To make that class of bug impossible, InfraWatch scopes the Prisma client automatically.

> [!IMPORTANT]
> The construction of the tenant-aware Prisma client, the `AsyncLocalStorage`
> context, and the `withTenantTransaction` wrapper are defined **once** in the
> canonical implementation doc:
> [Prisma Tenant Scoping (Canonical Implementation)](../11-multi-tenancy/01-prisma-rls-extensions.md).
> This document does not redefine `src/config/prisma.ts`; it only shows how the auth
> layer feeds tenant identity into it. If the two ever disagree, the canonical doc wins.

In short:

- `src/config/prisma.ts` exports a single, already tenant-aware `prisma` client. There is **no** `getTenantPrisma()` factory — services just `import { prisma }` and use it.
- The extension reads the current `tenantId` from `AsyncLocalStorage` and injects it into every query and mutation on tenant-scoped models. If no tenant context is present, tenant-scoped queries **fail closed** rather than returning cross-tenant rows.
- The same wrapper sets the Postgres session variable `app.current_tenant_id`, which activates the database-level RLS policies from [Migration V001](../01-database/02-migration-V001-baseline.md#row-level-security-policies). Application scoping and RLS are the **two layers** of our defense-in-depth model.

### Wrapping Requests in AsyncLocalStorage

The `tenantMiddleware` establishes both layers by wrapping the remainder of the request
in `withTenantTransaction` (defined in the canonical doc). This both populates the
`AsyncLocalStorage` store and sets `app.current_tenant_id` for RLS:

```typescript
// src/middleware/tenant.ts
import { withTenantTransaction } from '@/config/prisma';

export const tenantMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // ... extraction logic (see above) ...

  // Establishes app-level scoping AND database-level RLS for the whole request.
  withTenantTransaction(req.user.tenantId, async () => {
    next();
  }).catch(next);
};
```

---

## Cross-Tenant Operations

By design, **cross-tenant operations are impossible** through the standard API. 

If an operation genuinely requires cross-tenant access (e.g., a system background job aggregating anonymous usage stats, or super-admin scripts), it must use the **single, audited** system client — `getSystemPrisma()` — described in the [canonical implementation doc](../11-multi-tenancy/01-prisma-rls-extensions.md#the-system-unscoped-client). Instantiating a bare `new PrismaClient()` anywhere in the codebase is prohibited and blocked by an ESLint rule.

```typescript
// src/jobs/system-stats.ts
import { getSystemPrisma } from '@/config/prisma';

// Audited, unscoped client. Allowed only in allow-listed paths (jobs/admin/db).
const systemPrisma = getSystemPrisma();

async function generateGlobalStats() {
  const totalAssets = await systemPrisma.asset.count(); // Counts across ALL tenants
  // ...
}
```

---

## Related Documents

- **Previous:** [RBAC Model](./03-rbac-model.md)
- **Multi-Tenancy:** [Prisma Tenant Scoping (Canonical Implementation)](../11-multi-tenancy/01-prisma-rls-extensions.md)
- **Middleware:** [Middleware Pipeline](../03-backend/03-middleware-pipeline.md)
- **Index:** [IEKB Master Index](../00-foundation/00-IEKB-index.md)

