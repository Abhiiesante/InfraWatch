# Error Handling Strategy

> **IEKB Section:** 03 — Backend  
> **Document:** 02-error-handling.md  
> **Last Updated:** 2026-07-16  
> **Owner:** Backend Lead  
> **Status:** Approved

---

## Table of Contents

1. [Centralized Error Pattern](#centralized-error-pattern)
2. [The AppError Class](#the-apperror-class)
3. [Global Error Middleware](#global-error-middleware)
4. [Prisma Error Translation](#prisma-error-translation)
5. [Async Error Catching](#async-error-catching)
6. [Related Documents](#related-documents)

---

## Centralized Error Pattern

InfraWatch uses a **centralized error handling pattern**. 

Controllers and Services **never** send HTTP responses directly when an error occurs (e.g., `res.status(404).json(...)`). Instead, they `throw` an error or pass it to `next(error)`. The global error handling middleware catches everything, formats it into a standard JSON shape, logs it appropriately, and sends it to the client.

**Standard JSON Error Response:**
```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Asset with ID 142 could not be found.",
    "details": null,
    "requestId": "req-xyz-123"
  }
}
```

---

## The AppError Class

All operational errors (expected errors like validation failures, not-found, or forbidden) should be instances of `AppError`.

```typescript
// src/utils/errors.ts
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly details: any;

  constructor(
    code: string,
    message: string,
    statusCode: number = 500,
    details: any = null
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true; // Distinguishes from programming bugs

    Error.captureStackTrace(this, this.constructor);
  }
}

// Helper factories for common errors
export const NotFoundError = (resource: string) => 
  new AppError('NOT_FOUND', `${resource} not found`, 404);

export const ForbiddenError = (reason: string) => 
  new AppError('FORBIDDEN', reason, 403);
```

### Usage in Services

```typescript
async getAsset(tenantId: number, id: number) {
  const asset = await prisma.asset.findFirst({ where: { id, tenantId }});
  
  if (!asset) {
    // Correct way: throw AppError
    throw NotFoundError('Asset');
  }
  
  return asset;
}
```

---

## Global Error Middleware

The Express error handling middleware must be the **very last** middleware registered in `app.ts`.

```typescript
// src/middleware/error.ts
import { Request, Response, NextFunction } from 'express';
import { AppError } from '@/utils/errors';
import { logger } from '@/utils/logger';
import { ZodError } from 'zod';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let error = err;

  // 1. Convert specific errors to AppError
  if (err instanceof ZodError) {
    error = new AppError('VALIDATION_ERROR', 'Invalid input data', 400, err.errors);
  } else if (err.name === 'PrismaClientKnownRequestError') {
    error = handlePrismaError(err);
  }

  // 2. Extract properties (fallback to 500 for unhandled bugs)
  const isAppError = error instanceof AppError;
  const statusCode = isAppError ? (error as AppError).statusCode : 500;
  const code = isAppError ? (error as AppError).code : 'INTERNAL_SERVER_ERROR';
  const message = isAppError ? error.message : 'Something went wrong on our end';
  const details = isAppError ? (error as AppError).details : null;

  // 3. Logging
  if (statusCode >= 500) {
    // Log full stack trace for 500s (bugs)
    logger.error(`[${code}] ${error.message}`, { stack: error.stack, path: req.path });
  } else {
    // Info log for operational errors (4xx)
    logger.info(`[${code}] ${error.message} - ${req.path}`);
  }

  // 4. Send Response
  res.status(statusCode).json({
    error: {
      code,
      message,
      ...(details && { details }), // Only include details if they exist
      // In production, never leak stack traces
      ...(process.env.NODE_ENV === 'development' && !isAppError && { stack: error.stack }),
    },
  });
};
```

---

## Prisma Error Translation

Prisma throws specific errors for database-level constraints (e.g., unique constraint violations, foreign key failures). We must translate these into user-friendly `AppError` instances so the client doesn't receive ugly DB error strings.

```typescript
// Inside src/middleware/error.ts
function handlePrismaError(err: any): AppError {
  // P2002: Unique constraint failed
  if (err.code === 'P2002') {
    const target = err.meta?.target || 'field';
    return new AppError('CONFLICT', `A record with this ${target} already exists`, 409);
  }
  
  // P2003: Foreign key constraint failed
  if (err.code === 'P2003') {
    return new AppError('BAD_REQUEST', 'Referenced record does not exist or cannot be deleted', 400);
  }
  
  // P2025: Record to update/delete not found
  if (err.code === 'P2025') {
    return new AppError('NOT_FOUND', 'Record not found', 404);
  }

  return new AppError('DATABASE_ERROR', 'A database error occurred', 500);
}
```

---

## Async Error Catching

In Express v4, errors thrown inside `async` route handlers are **not** automatically caught by the global error handler, resulting in unhandled promise rejections and app crashes.

We use an `express-async-handler` wrapper (or a custom implementation) to automatically pass async errors to `next()`.

```typescript
// src/utils/asyncHandler.ts
import { Request, Response, NextFunction } from 'express';

export const catchAsync = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
```

### Usage in Controllers

Every asynchronous controller method must be wrapped in `catchAsync`.

```typescript
// src/controllers/asset.controller.ts
import { catchAsync } from '@/utils/asyncHandler';

class AssetController {
  
  // Without catchAsync, this would crash the app if assetService throws
  getById = catchAsync(async (req: Request, res: Response) => {
    const assetId = parseInt(req.params.id);
    const asset = await assetService.findById(req.tenantContext.tenantId, assetId);
    res.json(asset);
  });
  
}
```

> [!TIP]
> Express v5 (currently in beta) natively supports async error handling, making `catchAsync` wrappers unnecessary. We will evaluate migrating to Express 5 post-V1.0.

---

## Related Documents

- **Previous:** [Project Setup](./01-project-setup.md)
- **Next:** [Middleware Pipeline](./03-middleware-pipeline.md)
- **API Design:** [API Design Principles](../05-api/00-api-design-principles.md)
- **Index:** [IEKB Master Index](../00-foundation/00-IEKB-index.md)
