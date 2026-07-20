# Incident Response Runbook (Technical)

> **IEKB Section:** 15 — Runbooks  
> **Document:** 03-incident-response-runbook.md  
> **Last Updated:** 2026-07-16  
> **Owner:** DevOps Lead  
> **Status:** Approved

---

## Table of Contents

1. [API Returning 500s (High Error Rate)](#api-returning-500s-high-error-rate)
2. [Worker Queue Backed Up](#worker-queue-backed-up)
3. [Memory Leaks (OOM Kills)](#memory-leaks-oom-kills)
4. [Related Documents](#related-documents)

---

## API Returning 500s (High Error Rate)

**Symptom:** PagerDuty triggers a `HighErrorRate` alert.
**Dashboard:** [Grafana - API Health](https://grafana.infrawatch.com/d/api-health)

**Investigation Steps:**
1. Check CloudWatch Logs for the `infrawatch-api` log group. Filter for `{ $.level = "ERROR" }`.
2. Determine if the error is database-related (e.g., `PrismaClientKnownRequestError`). If yes, check RDS CPU and connection limits.
3. Determine if the error is due to a missing dependency (e.g., `AWS S3 Access Denied`). If yes, check recent IAM policy changes or secret rotation failures.
4. **Mitigation:** If this started immediately after a deployment, trigger an emergency rollback (see [Deployment Runbook](./01-deployment-runbook.md)).

---

## Worker Queue Backed Up

**Symptom:** PagerDuty triggers a `HighQueueLength` alert for BullMQ.
**Dashboard:** [Grafana - BullMQ Status](https://grafana.infrawatch.com/d/bullmq)

**Investigation Steps:**
1. Determine if the workers are crashing or just processing slowly. Check CloudWatch Logs for `infrawatch-worker`.
2. If processing slowly (e.g., PDF generation is taking 20s instead of 5s), scale up the worker count (see [Scaling Runbook](./04-scaling-runbook.md)).
3. If tasks are consistently failing and moving to the `failed` set, investigate the stack trace in the logs. You may need to manually pause the queue via Redis to prevent endless retry loops.
   ```bash
   # Connect to Redis via Bastion and run:
   redis-cli -h cache.infrawatch.internal
   > SET "bull:reportQueue:meta" '{"paused":true}'
   ```

---

## Memory Leaks (OOM Kills)

**Symptom:** ECS Tasks are frequently restarting. PagerDuty triggers a `ContainerRestartLoop` alert.
**Dashboard:** [AWS ECS Console](https://console.aws.amazon.com/ecs)

**Investigation Steps:**
1. Go to the ECS Cluster -> Tasks -> Stopped. Look at the stop reason. If it says `OutOfMemory`, the container breached its RAM limit.
2. Check the Grafana Memory dashboard. If memory usage climbs steadily until a crash (a sawtooth pattern), you have a memory leak.
3. **Mitigation:** Temporarily double the Task Memory allocation in Terraform and deploy. This buys time.
4. **Resolution:** Generate a Node.js heap snapshot locally using Chrome DevTools to find the un-garbage-collected objects.

---

## Related Documents

- **Project Management:** [Incident Response Policy](../13-project-management-management/05-incident-response.md)
- **Monitoring:** [Alerting Rules](../09-observability/04-alerting-rules.md)
- **Index:** [IEKB Master Index](../00-foundation/00-IEKB-index.md)

