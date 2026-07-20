# Observability Overview

> **IEKB Section:** 10 — Observability  
> **Document:** 00-observability-overview.md  
> **Last Updated:** 2026-07-16  
> **Owner:** DevOps Lead  
> **Status:** Approved

---

## Table of Contents

1. [Philosophy](#philosophy)
2. [The Three Pillars](#the-three-pillars)
3. [Toolchain (V0)](#toolchain-v0)
4. [Related Documents](#related-documents)

---

## Philosophy

You cannot fix what you cannot see. Observability in InfraWatch is not an afterthought; it is built into the architecture from Day 1. 

Our goal is to achieve a Mean Time To Resolution (MTTR) of under 2 hours for critical production incidents. This requires deep visibility into what the application is doing, why it is doing it, and who it is doing it for.

---

## The Three Pillars

InfraWatch implements the three pillars of observability:

1. **Logs (Events):** Immutable, timestamped records of discrete events (e.g., "User 123 logged in", "Failed to process image 456"). We strictly enforce *Structured Logging* (JSON) so logs are easily searchable.
2. **Metrics (Aggregations):** Numeric representations of data measured over intervals (e.g., "CPU Usage is 85%", "P99 API Latency is 150ms"). These power our dashboards and trigger alerts.
3. **Traces (Workflows):** Representations of the end-to-end journey of a single request across the distributed system (e.g., Request hits API ➔ API queues Job ➔ Worker processes Job).

---

## Toolchain (V0)

For V0, we utilize AWS-native tools combined with industry-standard open-source agents to minimize operational overhead.

- **Log Aggregation:** Amazon CloudWatch Logs (collected automatically from ECS Fargate containers via the `awslogs` driver).
- **Metrics Collection:** Prometheus (running as a managed workspace via AWS Managed Service for Prometheus - AMP).
- **Distributed Tracing:** AWS X-Ray (instrumented via the AWS Distro for OpenTelemetry - ADOT).
- **Visualization:** Grafana (AWS Managed Grafana).
- **Application Logging:** Pino (Node.js fast structured logger).

---

## Related Documents

- **Logging:** [Structured Logging Guide](./01-structured-logging.md)
- **Metrics:** [Prometheus Metrics](./02-metrics-prometheus.md)
- **Index:** [IEKB Master Index](../00-foundation/00-IEKB-index.md)
