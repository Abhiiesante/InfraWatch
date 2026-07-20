# Health Checks & Probes

> **IEKB Section:** 10 — Observability  
> **Document:** 05-health-checks.md  
> **Last Updated:** 2026-07-16  
> **Owner:** DevOps Lead  
> **Status:** Approved

---

## Table of Contents

1. [Overview](#overview)
2. [Liveness vs Readiness](#liveness-vs-readiness)
3. [Express Implementation](#express-implementation)
4. [ECS and ALB Integration](#ecs-and-alb-integration)
5. [Related Documents](#related-documents)

---

## Overview

Health checks are automated HTTP endpoints that infrastructure (like AWS Application Load Balancers and ECS) query to determine if an application container is healthy and ready to receive traffic.

---

## Liveness vs Readiness

We expose two separate endpoints:

1. **/health/liveness:** Answers "Is the Node.js process running?" It does not check database connections. If this fails, ECS forcibly kills and restarts the container.
2. **/health/readiness:** Answers "Is the application ready to process HTTP requests?" It actively pings the PostgreSQL database and Redis cluster. If this fails, the ALB stops routing traffic to this container, but ECS does *not* kill it (allowing it to recover if it's just a transient DB network blip).

---

## Express Implementation

```typescript
// src/routes/health.routes.ts
import { Router } from 'express';
import { prisma } from '@/config/prisma';
import { redisConnection } from '@/config/redis';

const router = Router();

// Liveness Probe (Extremely fast, no dependencies)
router.get('/health/liveness', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Readiness Probe (Checks critical downstream dependencies)
router.get('/health/readiness', async (req, res) => {
  try {
    // 1. Check PostgreSQL
    await prisma.$queryRaw`SELECT 1`;
    
    // 2. Check Redis
    await redisConnection.ping();

    res.status(200).json({ 
      status: 'READY',
      database: 'CONNECTED',
      redis: 'CONNECTED',
      timestamp: new Date().toISOString() 
    });
  } catch (error) {
    // Return 503 Service Unavailable so the ALB removes this instance from rotation
    res.status(503).json({ 
      status: 'UNAVAILABLE',
      error: (error as Error).message
    });
  }
});

export default router;
```

---

## ECS and ALB Integration

In Terraform, we configure the ALB Target Group to use the `/health/readiness` endpoint.

```hcl
# infrastructure/terraform/alb.tf
resource "aws_lb_target_group" "api" {
  name        = "infrawatch-api-tg"
  port        = 3000
  protocol    = "HTTP"
  vpc_id      = module.vpc.vpc_id
  target_type = "ip"

  health_check {
    path                = "/health/readiness"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 15
    matcher             = "200"
  }
}
```

We configure the ECS Task Definition to use the `/health/liveness` endpoint (or a Docker `CMD` check) to determine if the container should be restarted.

---

## Related Documents

- **Architecture:** [DevOps Overview](../08-devops/00-devops-overview.md)
- **Monitoring:** [Alerting Rules](./04-alerting-rules.md)
- **Index:** [IEKB Master Index](../00-foundation/00-IEKB-index.md)
