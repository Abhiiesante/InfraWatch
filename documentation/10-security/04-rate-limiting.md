# Rate Limiting

> **IEKB Section:** 11 — Security  
> **Document:** 04-rate-limiting.md  
> **Last Updated:** 2026-07-16  
> **Owner:** Security Lead  
> **Status:** Approved

---

## Table of Contents

1. [Overview](#overview)
2. [Redis Implementation](#redis-implementation)
3. [Strict Auth Limiting](#strict-auth-limiting)
4. [Related Documents](#related-documents)

---

## Overview

Rate limiting prevents abuse (both malicious DDoS attacks and accidental runaway client scripts) by restricting how many HTTP requests a single IP address (or User ID) can make within a specific time window.

Because our API runs across multiple stateless ECS containers, we cannot store rate limit counters in local memory. We must use a centralized store: **Redis**.

---

## Redis Implementation

We use `express-rate-limit` combined with `rate-limit-redis`.

```typescript
// src/middlewares/rate-limit.middleware.ts
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { redisConnection } from '@/config/redis';

// Global API Rate Limiter
export const globalLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args: string[]) => redisConnection.call(...args),
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later.'
    }
  }
});
```

The global limiter is applied to all `/api/v1/*` routes.

---

## Strict Auth Limiting

Endpoints that perform authentication (login, password reset) are highly vulnerable to brute-force attacks. We apply a much stricter rate limiter to these specific routes.

```typescript
// src/routes/auth.routes.ts
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { redisConnection } from '@/config/redis';

const authLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args: string[]) => redisConnection.call(...args),
  }),
  windowMs: 60 * 60 * 1000, // 1 Hour
  max: 5, // Only 5 login attempts per hour per IP
  message: {
    error: {
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      message: 'Too many login attempts, please try again after an hour.'
    }
  }
});

const router = Router();
router.post('/login', authLimiter, AuthController.login);

export default router;
```

---

## Related Documents

- **Architecture:** [Security Overview](./00-security-overview.md)
- **Infrastructure:** [Terraform ElastiCache](../08-devops/08-terraform-elasticache.md)
- **Index:** [IEKB Master Index](../00-foundation/00-IEKB-index.md)
