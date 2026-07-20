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

  // Also set PostgreSQL session variable for RLS (if using transaction-level RLS)
  // See section below on Prisma Client Extension

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

While explicitly passing `tenantId` is good practice, human error (forgetting to add `tenantId` to a `where` clause) can cause data leaks. 

InfraWatch V0 implements a **Prisma Client Extension** to automatically inject the `tenantId` into all queries.

```typescript
// src/config/prisma.ts
import { PrismaClient } from '@prisma/client';
import { AsyncLocalStorage } from 'async_hooks';

// AsyncLocalStorage holds context across async operations without passing it manually
export const tenantStorage = new AsyncLocalStorage<{ tenantId: number }>();

const prismaBase = new PrismaClient();

// The Extended Prisma Client
export const prisma = prismaBase.$extends({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        // Models that are NOT tenant-scoped
        const globalModels = ['Organization', 'RefreshToken'];
        if (globalModels.includes(model)) return query(args);

        const store = tenantStorage.getStore();
        
        // If we are in a tenant context, enforce it
        if (store?.tenantId) {
          const tenantId = store.tenantId;

          // Automatically inject tenantId into WHERE clauses
          if (['findUnique', 'findFirst', 'findMany', 'update', 'updateMany', 'delete', 'deleteMany', 'count'].includes(operation)) {
            args.where = { ...args.where, tenantId };
          }
          
          // Automatically inject tenantId into CREATE data
          if (['create', 'createMany'].includes(operation)) {
            if (Array.isArray(args.data)) {
              args.data = args.data.map(item => ({ ...item, tenantId }));
            } else {
              args.data = { ...args.data, tenantId };
            }
          }
        }
        
        return query(args);
      },
    },
  },
});
```

### Wrapping Requests in AsyncLocalStorage

The `tenantMiddleware` wraps the `next()` call in the storage run context:

```typescript
// Updated src/middleware/tenant.ts
export const tenantMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // ... extraction logic ...
  
  // Wrap the rest of the request lifecycle in the async local storage context
  tenantStorage.run({ tenantId: req.user.tenantId }, () => {
    next();
  });
};
```

---

## Cross-Tenant Operations

By design, **cross-tenant operations are impossible** through the standard API. 

If an operation genuinely requires cross-tenant access (e.g., a system background job aggregating anonymous usage stats, or super-admin scripts), it must bypass the API entirely and use a separate, raw `PrismaClient` instance that does not have the extension applied.

```typescript
// src/jobs/system-stats.ts
import { PrismaClient } from '@prisma/client';

// Raw client, no extensions, bypasses tenant isolation
const rawPrisma = new PrismaClient(); 

async function generateGlobalStats() {
  const totalAssets = await rawPrisma.asset.count(); // Counts across ALL tenants
  // ...
}
```

---

## Related Documents

- **Previous:** [RBAC Model](./03-rbac-model.md)
- **Multi-Tenancy:** [Data Isolation Strategy](../11-multi-tenancy/01-data-isolation.md)
- **Middleware:** [Middleware Pipeline](../03-backend/03-middleware-pipeline.md)
- **Index:** [IEKB Master Index](../00-foundation/00-IEKB-index.md)

