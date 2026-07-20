# Prometheus Metrics Guide

> **IEKB Section:** 10 — Observability  
> **Document:** 02-metrics-prometheus.md  
> **Last Updated:** 2026-07-16  
> **Owner:** DevOps Lead  
> **Status:** Approved

---

## Table of Contents

1. [Overview](#overview)
2. [Exposing Metrics in Express](#exposing-metrics-in-express)
3. [Key Application Metrics](#key-application-metrics)
4. [ECS Fargate Scraping](#ecs-fargate-scraping)
5. [Related Documents](#related-documents)

---

## Overview

We use **Prometheus** to gather time-series metrics from our application. Rather than pushing metrics to a central server, Prometheus operates on a *pull* model. Our applications expose a `/metrics` endpoint, and the Prometheus server scrapes that endpoint at a regular interval (e.g., every 15 seconds).

---

## Exposing Metrics in Express

We use `prom-client` to generate and expose metrics in the Node.js backend.

```typescript
// src/utils/metrics.ts
import client from 'prom-client';

// Collect default Node.js metrics (CPU, RAM, Event Loop lag)
client.collectDefaultMetrics({ prefix: 'infrawatch_' });

// Custom Metric: Track HTTP Request Durations
export const httpRequestDurationMicroseconds = new client.Histogram({
  name: 'infrawatch_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10] // Defined latency buckets
});

// Custom Metric: Business Logic Counters
export const reportsGeneratedCounter = new client.Counter({
  name: 'infrawatch_reports_generated_total',
  help: 'Total number of PDF reports generated',
  labelNames: ['tenant_id', 'status'] // 'success' or 'error'
});

export const registry = client.register;
```

Attach this to an Express route:

```typescript
// src/routes/health.routes.ts
import { Router } from 'express';
import { registry } from '@/utils/metrics';

const router = Router();

router.get('/metrics', async (req, res) => {
  res.set('Content-Type', registry.contentType);
  res.end(await registry.metrics());
});

export default router;
```

---

## Key Application Metrics

1. **HTTP Latency (`infrawatch_http_request_duration_seconds`):** Monitors API degradation.
2. **Database Connection Pool Size:** Monitors if Prisma is exhausting connections to RDS.
3. **Queue Lengths (BullMQ):** Exposed via a specific BullMQ Prometheus exporter to monitor if workers are falling behind.
4. **Active Cameras (`infrawatch_active_cameras`):** A gauge metric to track system usage over time.

---

## ECS Fargate Scraping

Since ECS tasks are ephemeral and constantly changing IP addresses, Prometheus uses AWS Service Discovery (Cloud Map) to automatically find and scrape the `/metrics` endpoints of all running containers.

For V0, we use the **AWS Distro for OpenTelemetry (ADOT)** sidecar container to scrape the metrics locally and push them to Amazon Managed Prometheus (AMP).

---

## Related Documents

- **Architecture:** [Observability Overview](./00-observability-overview.md)
- **Dashboards:** [Grafana Dashboards](./05-dashboards-grafana.md)
- **Index:** [IEKB Master Index](../00-foundation/00-IEKB-index.md)
