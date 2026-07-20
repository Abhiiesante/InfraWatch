# Middleware Pipeline

> **IEKB Section:** 03 — Backend  
> **Document:** 03-middleware-pipeline.md  
> **Last Updated:** 2026-07-16  
> **Owner:** Backend Lead  
> **Status:** Approved

---

## Table of Contents

1. [Pipeline Overview](#pipeline-overview)
2. [Global Middleware](#global-middleware)
3. [Route-Specific Middleware](#route-specific-middleware)
4. [Request Validation (Zod)](#request-validation-zod)
5. [Audit Logging Middleware](#audit-logging-middleware)
6. [Related Documents](#related-documents)

---

## Pipeline Overview

Express relies on a strict sequential execution of middleware. The order in which middleware is registered in `app.ts` is exactly the order in which requests are processed.

**The Golden Order:**
1. Security & Parsing (Global)
2. Authentication (Route-level)
3. Tenant Context Extraction (Route-level)
4. Authorization / RBAC (Route-level)
5. Input Validation (Route-level)
6. Controller Execution
7. Error Handling (Global - bottom of file)

---

## Global Middleware

Registered at the top of `app.ts` before any routes.

```typescript
import helmet from 'helmet';
import cors from 'cors';
import express from 'express';
import pinoHttp from 'pino-http'; // HTTP request logger

// 1. Security Headers
app.use(helmet());

// 2. CORS
app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
}));

// 3. Request Logging (logs every request and response time)
app.use(pinoHttp({ logger }));

// 4. Body Parsing
app.use(express.json({ limit: '5mb' })); // Limit body size to prevent DoS
app.use(express.urlencoded({ extended: true }));
```

---

## Route-Specific Middleware

Instead of applying auth globally, we apply it to a `v1Router`, allowing public endpoints (like `/health` or webhooks) to bypass auth.

```typescript
import { authMiddleware } from '@/middleware/auth';
import { tenantMiddleware } from '@/middleware/tenant';
import { requireRole } from '@/middleware/rbac';

const protectedRouter = express.Router();

// ALL routes on this router require valid JWT + Tenant Context
protectedRouter.use(authMiddleware);
protectedRouter.use(tenantMiddleware);

// Example: Assets Route
protectedRouter.post(
  '/assets',
  requireRole('ADMIN', 'MANAGER'), // RBAC
  validateRequest(createAssetSchema), // Validation
  assetController.create // Controller
);
```

---

## Request Validation (Zod)

All incoming data (`req.body`, `req.query`, `req.params`) must be validated and sanitized before reaching the controller. We use Zod for schema definition and a custom middleware to apply it.

### The Validation Middleware

```typescript
// src/middleware/validate.ts
import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';

export const validateRequest = (schema: AnyZodObject) => 
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Parse throws a ZodError if validation fails
      // We overwrite req data with parsed data to ensure sanitization (stripping unknown keys)
      const parsed = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      
      req.body = parsed.body;
      req.query = parsed.query;
      req.params = parsed.params;
      
      next();
    } catch (error) {
      // Passes the ZodError to the global error handler
      next(error); 
    }
  };
```

### Schema Example

```typescript
// src/modules/assets/asset.schema.ts
import { z } from 'zod';

export const createAssetSchema = z.object({
  body: z.object({
    name: z.string().min(3).max(255),
    assetTypeId: z.number().int().positive().optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    metadata: z.record(z.any()).optional(),
  })
});
```

---

## Audit Logging Middleware

Certain high-value actions (creating users, changing settings, deleting assets) require audit logging. Instead of cluttering the Service layer with audit code, we use a targeted middleware for specific routes.

```typescript
// src/middleware/audit.ts
import { Request, Response, NextFunction } from 'express';
import { prisma } from '@/config/prisma';

/**
 * Middleware to asynchronously log actions to the audit_logs table.
 * Does not block the HTTP response.
 */
export const auditAction = (entityType: string, action: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    
    // We want to log AFTER the request succeeds
    res.on('finish', () => {
      // Only log if the request was successful (2xx)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        
        const { tenantId, userId } = req.tenantContext;
        // Assume controller attaches the created/modified entity ID to res.locals
        const entityId = res.locals.entityId || null; 
        
        // Fire and forget (don't await)
        prisma.auditLog.create({
          data: {
            tenantId,
            userId,
            action,
            entityType,
            entityId,
            ipAddress: req.ip,
          }
        }).catch(err => {
          // Log failure to write audit log, but user request already succeeded
          console.error('Failed to write audit log:', err);
        });
      }
    });
    
    next();
  };
};
```

**Usage:**
```typescript
router.delete(
  '/assets/:id',
  requireRole('ADMIN'),
  auditAction('ASSET', 'DELETE'),
  assetController.delete
);
```

---

## Related Documents

- **Auth Pipelines:** [JWT Implementation](../02-auth/01-jwt-implementation.md)
- **Error Handling:** [Error Handling Strategy](./02-error-handling.md)
- **Security:** [Application Security](../10-security/03-application-security.md)
- **Index:** [IEKB Master Index](../00-foundation/00-IEKB-index.md)

