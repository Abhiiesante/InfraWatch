# Structured Logging Guide

> **IEKB Section:** 10 — Observability  
> **Document:** 01-structured-logging.md  
> **Last Updated:** 2026-07-16  
> **Owner:** Backend Lead  
> **Status:** Approved

---

## Table of Contents

1. [Why Structured Logging?](#why-structured-logging)
2. [Pino Configuration](#pino-configuration)
3. [Logging Best Practices](#logging-best-practices)
4. [Request Context Logging](#request-context-logging)
5. [Related Documents](#related-documents)

---

## Why Structured Logging?

Traditional string-based logging (`console.log("User 123 failed to login")`) is impossible to query efficiently at scale. 

Structured logging outputs pure JSON. CloudWatch Logs (and downstream tools like ElasticSearch or Datadog) parse this JSON, allowing us to perform complex queries like: "Show me all logs where `level=error` AND `tenantId=5` AND `route=/api/v1/assets`."

---

## Pino Configuration

We use `pino`, an extremely fast Node.js logger. 

```typescript
// src/utils/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    // Keep standard log levels (info, warn, error) instead of numeric values
    level: (label) => {
      return { level: label.toUpperCase() };
    },
  },
  // In local development, we use pino-pretty for human-readable output.
  // In production, we output raw JSON for CloudWatch.
  transport: process.env.NODE_ENV !== 'production' 
    ? { target: 'pino-pretty', options: { colorize: true } }
    : undefined,
});
```

---

## Logging Best Practices

1. **Never log PII or Secrets:** Never log passwords, tokens, or raw user objects.
2. **Pass Objects, Not Strings:** 
   - ❌ Bad: `logger.error("Failed to fetch asset " + assetId + " for tenant " + tenantId)`
   - ✅ Good: `logger.error({ assetId, tenantId }, "Failed to fetch asset")`
3. **Log Exceptions properly:** Pass the error object directly so Pino captures the stack trace.
   - ✅ Good: `logger.error({ err, assetId }, "Database query failed")`

---

## Request Context Logging

To trace a specific HTTP request from start to finish, we use a middleware (like `pino-http`) that automatically attaches a unique `requestId`, `tenantId`, and `userId` to every log generated during that request.

```typescript
// src/middlewares/logging.middleware.ts
import pinoHttp from 'pino-http';
import { logger } from '@/utils/logger';
import crypto from 'crypto';

export const requestLogger = pinoHttp({
  logger,
  genReqId: (req) => req.headers['x-request-id'] || crypto.randomUUID(),
  customProps: (req, res) => {
    return {
      // These are populated by the Auth Middleware earlier in the chain
      tenantId: (req as any).tenantId,
      userId: (req as any).userId,
    };
  }
});
```

Now, every log line related to an API call automatically includes the tenant and user context.

---

## Related Documents

- **Architecture:** [Observability Overview](./00-observability-overview.md)
- **API Setup:** [Express Architecture](../03-backend/00-express-architecture.md)
- **Index:** [IEKB Master Index](../00-foundation/00-IEKB-index.md)
