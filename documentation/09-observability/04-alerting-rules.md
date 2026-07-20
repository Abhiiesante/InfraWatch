# Alerting Rules & Routing

> **IEKB Section:** 10 — Observability  
> **Document:** 04-alerting-rules.md  
> **Last Updated:** 2026-07-16  
> **Owner:** DevOps Lead  
> **Status:** Approved

---

## Table of Contents

1. [Overview](#overview)
2. [Alert Severity Levels](#alert-severity-levels)
3. [Prometheus Alerting Rules](#prometheus-alerting-rules)
4. [Routing & PagerDuty Integration](#routing--pagerduty-integration)
5. [Related Documents](#related-documents)

---

## Overview

Alerts notify the engineering team when the system violates predefined thresholds (SLOs). We use **Prometheus Alertmanager** (managed via Amazon Managed Prometheus) to evaluate metrics and trigger notifications.

---

## Alert Severity Levels

We classify alerts into three strict severity levels to prevent alert fatigue:

1. **CRITICAL (P1):** System is down or fundamentally broken for many users. (e.g., API is returning 500s, RDS is down).
   - **Action:** Triggers PagerDuty to wake up the on-call engineer immediately (24/7).
2. **WARNING (P2):** Degraded performance or a subsystem failure. (e.g., Background workers are lagging, API P95 latency is > 2 seconds).
   - **Action:** Sends a message to the `#eng-alerts` Slack channel. Requires attention during business hours.
3. **INFO (P3):** Informational thresholds. (e.g., Storage is at 70% capacity).
   - **Action:** Silently logged; reviewed during weekly DevOps syncs.

---

## Prometheus Alerting Rules

Alerts are defined using PromQL (Prometheus Query Language).

```yaml
# prometheus/alerts/api.rules.yml
groups:
  - name: api-alerts
    rules:
      - alert: HighErrorRate
        expr: |
          rate(infrawatch_http_request_duration_seconds_count{status_code=~"5.."}[5m]) 
          / 
          rate(infrawatch_http_request_duration_seconds_count[5m]) > 0.05
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "High API Error Rate (> 5%)"
          description: "Over 5% of API requests are returning 5xx errors over the last 5 minutes."

      - alert: ApiLatencyDegraded
        expr: |
          histogram_quantile(0.95, sum(rate(infrawatch_http_request_duration_seconds_bucket[5m])) by (le)) > 2.0
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "API Latency Degradation"
          description: "The 95th percentile latency is over 2 seconds."
```

---

## Routing & PagerDuty Integration

Prometheus Alertmanager uses standard webhook integrations to route alerts based on their `severity` label.

```yaml
# prometheus/alertmanager.yml
route:
  receiver: 'slack-alerts'
  group_by: ['alertname', 'severity']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h

  routes:
    - match:
        severity: critical
      receiver: 'pagerduty-critical'

receivers:
  - name: 'slack-alerts'
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/...'
        channel: '#eng-alerts'

  - name: 'pagerduty-critical'
    pagerduty_configs:
      - service_key: '...'
```

---

## Related Documents

- **Architecture:** [Observability Overview](./00-observability-overview.md)
- **Metrics:** [Prometheus Metrics](./02-metrics-prometheus.md)
- **Index:** [IEKB Master Index](../00-foundation/00-IEKB-index.md)
