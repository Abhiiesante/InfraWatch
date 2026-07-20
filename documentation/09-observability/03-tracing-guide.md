# Distributed Tracing Guide

> **IEKB Section:** 10 — Observability  
> **Document:** 03-tracing-guide.md  
> **Last Updated:** 2026-07-16  
> **Owner:** DevOps Lead  
> **Status:** Approved

---

## Table of Contents

1. [Overview](#overview)
2. [OpenTelemetry Auto-Instrumentation](#opentelemetry-auto-instrumentation)
3. [AWS X-Ray Integration](#aws-x-ray-integration)
4. [Tracing BullMQ](#tracing-bullmq)
5. [Related Documents](#related-documents)

---

## Overview

Distributed tracing allows us to track a single user request as it traverses across the frontend, the API gateway, the Express server, the PostgreSQL database, and eventually to the background workers.

We use **OpenTelemetry (OTel)** as the vendor-neutral standard for instrumentation, and send the data to **AWS X-Ray** for visualization and analysis.

---

## OpenTelemetry Auto-Instrumentation

Manually wrapping every function in tracing code is tedious. We use the `@opentelemetry/auto-instrumentations-node` package to automatically inject tracing spans into popular libraries (Express, Prisma, HTTP, DNS).

```typescript
// src/instrumentation.ts
// THIS FILE MUST BE REQUIRED BEFORE APP STARTS (e.g., node --require ./dist/instrumentation.js ./dist/server.js)

import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter(),
  instrumentations: [
    getNodeAutoInstrumentations({
      // We disable fs tracing as it creates too much noise
      '@opentelemetry/instrumentation-fs': { enabled: false },
    }),
  ],
});

sdk.start();
```

---

## AWS X-Ray Integration

Because we use AWS Fargate, we deploy an **ADOT (AWS Distro for OpenTelemetry)** Sidecar alongside our API container.

1. The API container generates OTel traces and sends them to `localhost:4317` (the ADOT sidecar).
2. The ADOT sidecar batches the traces, translates them into the AWS X-Ray format, and pushes them securely to AWS using the ECS Task IAM Role.
3. In the AWS Console, X-Ray generates a visual Service Map, allowing us to immediately see if the bottleneck for a slow request is the Express code or the PostgreSQL database.

---

## Tracing BullMQ

When a request enqueues a background job, the HTTP request technically finishes, but the "business transaction" is still ongoing. 

To link the web trace to the worker trace:
1. The API injects the current trace context (Trace ID) into the BullMQ job payload.
2. The Worker extracts the Trace ID from the payload before processing and creates a new Child Span linked to the original Parent Trace.

```typescript
// Injecting context in API
import { context, trace } from '@opentelemetry/api';

const activeContext = {}
trace.getTracer('bullmq').inject(context.active(), activeContext);

await reportQueue.add('generate', { ...data, _traceContext: activeContext });
```

---

## Related Documents

- **Architecture:** [Observability Overview](./00-observability-overview.md)
- **Workers:** [BullMQ Architecture](../06-workers/00-bullmq-architecture.md)
- **Index:** [IEKB Master Index](../00-foundation/00-IEKB-index.md)
