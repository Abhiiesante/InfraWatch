# Incident Response (System Outages)

> **IEKB Section:** 14 — Project Management  
> **Document:** 05-incident-response.md  
> **Last Updated:** 2026-07-16  
> **Owner:** Engineering Manager  
> **Status:** Approved

---

## Table of Contents

1. [Triggering an Incident](#triggering-an-incident)
2. [The War Room](#the-war-room)
3. [The Blameless Post-Mortem](#the-blameless-post-mortem)
4. [Related Documents](#related-documents)

---

## Triggering an Incident

When PagerDuty pages the on-call engineer for a Severity 1 (CRITICAL) alert (e.g., API is returning 500s globally), the engineer must formally declare an incident.

**Immediate Actions:**
1. Acknowledge the page in PagerDuty (stops escalation).
2. Type `/incident declare` in the `#eng-general` Slack channel. This spins up a dedicated `#inc-date-issue` Slack channel and a Zoom "War Room" link.
3. Page the Engineering Manager to act as the Incident Commander (IC).

---

## The War Room

During an active incident, roles are strictly defined to prevent chaos:

- **Incident Commander (IC):** (Usually the Eng Manager). They do NOT look at code. They orchestrate the room, communicate with Customer Success, and ensure the engineers have what they need.
- **Subject Matter Expert (SME):** (The on-call engineer or a paged specialist). They actively investigate logs (CloudWatch), metrics (Grafana), and code to identify the root cause and propose a fix.
- **Scribe:** (Anyone). Documents exactly what commands were run and when in the Slack channel.

**The Priority is Mitigation, not Perfection.** If a bad deployment caused the outage, immediately revert the PR and deploy `main`. Do not try to debug the bad code on the live server while customers are down.

---

## The Blameless Post-Mortem

Within 48 hours of resolving a Sev 1 incident, a Post-Mortem document must be written.

**Rule:** We assume everyone did the best they could with the information they had. We blame *systems*, not *people*. 
- ❌ Bad: "John forgot to add the database index."
- ✅ Good: "The CI pipeline did not flag the missing database index for a query operating on >1M rows."

The Post-Mortem must result in actionable Jira tickets (e.g., "Add automated EXPLAIN ANALYZE checks to CI") to ensure the same incident never happens twice.

---

## Related Documents

- **Monitoring:** [Alerting Rules](../09-observability/04-alerting-rules.md)
- **Index:** [IEKB Master Index](../00-foundation/00-IEKB-index.md)

