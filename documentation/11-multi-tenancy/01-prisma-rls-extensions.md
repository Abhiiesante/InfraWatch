# Prisma Tenant Scoping (Canonical Implementation)

> **IEKB Section:** 11 — Multi-Tenancy
> **Document:** 01-prisma-rls-extensions.md
> **Last Updated:** 2026-07-20
> **Owner:** Backend Lead
> **Status:** Approved

> [!IMPORTANT]
> This document is the **single source of truth** for how the Prisma client is
> constructed and how tenant scoping is enforced in application code. Any other
> document that shows `src/config/prisma.ts` (notably
> [Tenant Context in Authentication](../02-auth/04-tenant-context.md)) defers to
> this file. If you find a conflicting definition elsewhere, this document wins —
> please open a PR to fix the other doc.

---

## Table of Contents

1. [The Problem with Shared DBs](#the-problem-with-shared-dbs)
2. [Two Layers of Isolation](#two-layers-of-isolation)
3. [The Canonical Prisma Client](#the-canonical-prisma-client)
4. [Wiring the Tenant Context](#wiring-the-tenant-context)
5. [Using the Client in Services](#using-the-client-in-services)
6. [The System (Unscoped) Client](#the-system-unscoped-client)
7. [Related Documents](#related-documents)

---

## The Problem with Shared DBs

InfraWatch uses a **shared database, shared schema** model. Every tenant's rows live
in the same tables, separated only by a `tenantId` column. If a developer writes:

```typescript
prisma.incident.findMany({ where: { status: 'OPEN' } });
```

...a naive implementation returns *all* open incidents for *all* organizations. This
is the catastrophic cross-tenant data leak that our "zero cross-tenant data leaks"
launch criterion exists to prevent.

We eliminate this failure mode by making it **impossible to run a tenant-scoped query
without a tenant filter**, enforced in two independent layers.

---

## Two Layers of Isolation

InfraWatch enforces tenant isolation with **two independent layers**. This is the
"defense in depth" referenced in [ADR-002](../00-foundation/04-tech-stack-decisions.md),
the [Architecture Overview](../00-foundation/03-architecture-overview.md), and the
[Security Overview](../10-security/00-security-overview.md). Both layers are real and
both are wired by the single client below.

| Layer | Mechanism | What it protects against |
|-------|-----------|--------------------------|
| **Layer 1 — Application** | Prisma Client Extension auto-injects `tenantId` into every query and mutation on tenant-scoped models. | A developer forgetting a `where: { tenantId }` clause. |
| **Layer 2 — Database** | PostgreSQL Row-Level Security (RLS) policies filter by `app.current_tenant_id`, which the same extension sets via `SET LOCAL` on each transaction. | A bug in the extension, a raw query, or any code path that reaches the DB with a tenant context but an incorrect filter. |

> [!NOTE]
> The RLS policies themselves are created in
> [Migration V001 — Baseline Schema](../01-database/02-migration-V001-baseline.md#row-level-security-policies).
> This document supplies the application half — setting `app.current_tenant_id` so
> those policies have a value to enforce against. Neither layer is optional; they are
> installed and wired together.

---

## The Canonical Prisma Client

There is exactly **one** exported `prisma` instance. It is already tenant-aware. There
is **no** `getTenantPrisma(tenantId)` factory — services do not construct their own
clients. Tenant identity flows implicitly through `AsyncLocalStorage`, which is
populated once per request by the tenant middleware (see next section).

```typescript
// src/config/prisma.ts
import { PrismaClient, Prisma } from '@prisma/client';
import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Per-request tenant context. Populated once by tenantMiddleware and read by the
 * Prisma extension below. Never set this from application/service code directly.
 */
export const tenantStorage = new AsyncLocalStorage<{ tenantId: number }>();

/** Models that are NOT scoped to a tenant. Everything else is tenant-scoped. */
const GLOBAL_MODELS = new Set<string>(['Organization', 'RefreshToken']);

const READ_OPS = new Set(['findUnique', 'findUniqueOrThrow', 'findFirst', 'findFirstOrThrow', 'findMany', 'count', 'aggregate', 'groupBy']);
const MUTATE_WHERE_OPS = new Set(['update', 'updateMany', 'delete', 'deleteMany', 'upsert']);
const CREATE_OPS = new Set(['create', 'createMany']);

const base = new PrismaClient();

export const prisma = base.$extends({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        // Global (non-tenant) models pass straight through.
        if (!model || GLOBAL_MODELS.has(model)) {
          return query(args);
        }

        const store = tenantStorage.getStore();

        // No tenant context => this must be the system client path or a bug.
        // Fail closed rather than silently returning cross-tenant data.
        if (!store?.tenantId) {
          throw new Error(
            `Tenant-scoped query on "${model}.${operation}" attempted with no tenant context. ` +
            `Use getSystemPrisma() for intentional cross-tenant work.`,
          );
        }

        const tenantId = store.tenantId;
        const a = args as Record<string, unknown>;

        if (READ_OPS.has(operation) || MUTATE_WHERE_OPS.has(operation)) {
          a.where = { ...(a.where as object), tenantId };
        }

        if (operation === 'upsert') {
          a.create = { ...(a.create as object), tenantId };
        }

        if (CREATE_OPS.has(operation)) {
          if (Array.isArray(a.data)) {
            a.data = a.data.map((d) => ({ ...(d as object), tenantId }));
          } else {
            a.data = { ...(a.data as object), tenantId };
          }
        }

        return query(a);
      },
    },
  },
});

/**
 * Runs `fn` inside a transaction that has set the Postgres session variable
 * `app.current_tenant_id`, which activates the RLS policies (Layer 2). The tenant
 * middleware wraps each request in this so both layers are always active together.
 */
export async function withTenantTransaction<T>(tenantId: number, fn: () => Promise<T>): Promise<T> {
  return base.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${String(tenantId)}, true)`;
    return tenantStorage.run({ tenantId }, fn);
  });
}
```

> [!WARNING]
> `SET LOCAL` / `set_config(..., true)` only persists for the life of a transaction.
> This is deliberate and is why it is paired with `$transaction`. It also means it is
> safe under PgBouncer in **transaction** pooling mode, because the session variable is
> scoped to the transaction rather than the pooled connection. This is the concern that
> earlier drafts cited when they (incorrectly) claimed RLS had been abandoned — it is
> resolved by scoping the variable to the transaction, not the session.

---

## Wiring the Tenant Context

The tenant middleware is the **only** place that populates the tenant context. It
extracts `tenantId` from the verified JWT (never from a header, query, or body — see
[Tenant Context in Authentication](../02-auth/04-tenant-context.md)) and wraps the rest
of the request in `withTenantTransaction`.

```typescript
// src/middleware/tenant.ts
import { Request, Response, NextFunction } from 'express';
import { withTenantTransaction } from '@/config/prisma';
import { AppError } from '@/utils/errors';

export const tenantMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(new AppError('UNAUTHORIZED', 'Authentication required before tenant extraction', 401));
  }

  const tenantId = req.user.tenantId; // integer, from the verified JWT payload
  if (!tenantId) {
    return next(new AppError('FORBIDDEN', 'User is not associated with a tenant', 403));
  }

  req.tenantContext = { tenantId, userId: req.user.sub, userRole: req.user.role };

  // Establishes BOTH layers for the remainder of the request:
  //  - AsyncLocalStorage store  -> app-level auto-injection
  //  - app.current_tenant_id     -> database-level RLS
  withTenantTransaction(tenantId, async () => {
    next();
  }).catch(next);
};
```

---

## Using the Client in Services

Services import the single `prisma` client and use it normally. Reads and writes are
auto-scoped, so a missing `where: { tenantId }` can no longer leak data. Services still
pass `tenantId` explicitly for **creates** and **ownership checks** — this is a
belt-and-suspenders practice and keeps the code self-documenting, but it is no longer
the *only* thing standing between tenants.

```typescript
import { prisma } from '@/config/prisma';

export class AssetService {
  // SAFE: the extension rewrites this to include `where: { tenantId }`,
  // and Postgres RLS independently enforces the same filter.
  async list() {
    return prisma.asset.findMany({ where: { deletedAt: null } });
  }
}
```

---

## The System (Unscoped) Client

Some legitimate work is inherently cross-tenant: background aggregation jobs, the
super-admin console, and the migration/seed tooling. These use a **single, explicitly
named** system client. There is exactly one such export, and reaching for a bare
`new PrismaClient()` anywhere else is prohibited.

```typescript
// src/config/prisma.ts (continued)

/**
 * Unscoped client for intentional cross-tenant/system work ONLY.
 * Bypasses Layer 1 (the extension). To also bypass Layer 2 (RLS) the caller must run
 * as a role with BYPASSRLS or set app.current_tenant_id appropriately.
 */
export function getSystemPrisma() {
  return base; // the raw, unextended client
}
```

> [!IMPORTANT]
> **Enforcement.** Direct `new PrismaClient()` and use of `getSystemPrisma()` are
> restricted by an ESLint rule so the escape hatch cannot be reached casually:
>
> ```jsonc
> // .eslintrc — no-restricted-syntax
> "rules": {
>   "no-restricted-syntax": [
>     "error",
>     {
>       "selector": "NewExpression[callee.name='PrismaClient']",
>       "message": "Do not instantiate PrismaClient directly. Import { prisma } from '@/config/prisma', or getSystemPrisma() for audited cross-tenant work."
>     }
>   ]
> }
> ```
>
> `getSystemPrisma` is additionally allow-listed to a small set of paths
> (`src/jobs/**`, `src/admin/**`, `src/db/**`) via an `overrides` block, so a call from
> a normal service file fails CI.

---

## Related Documents

- **Architecture:** [Tenancy Overview](./00-tenancy-overview.md)
- **Auth wiring:** [Tenant Context in Authentication](../02-auth/04-tenant-context.md)
- **Isolation strategies:** [Tenant Isolation Strategies](./02-tenant-isolation-strategies.md)
- **RLS policies (Layer 2):** [Migration V001 — Baseline Schema](../01-database/02-migration-V001-baseline.md#row-level-security-policies)
- **Index:** [IEKB Master Index](../00-foundation/00-IEKB-index.md)
