# Runbook Index

> **IEKB Section:** 15 — Runbooks  
> **Document:** 00-runbook-index.md  
> **Last Updated:** 2026-07-16  
> **Owner:** DevOps Lead  
> **Status:** Approved

---

## What is a Runbook?

A Runbook is a highly specific, step-by-step guide designed to be read during high-stress situations (like a production outage). 

Runbooks assume the reader is an engineer, but perhaps not the subject matter expert for the failing system. Therefore, commands must be exact, and assumptions must be explicitly stated.

---

## Available Runbooks

- **Deployments & Rollbacks:** [Deployment Runbook](./01-deployment-runbook.md) (How to push code manually, how to revert a bad deployment).
- **Database Operations:** [Database Runbook](./02-database-runbook.md) (How to execute manual migrations, how to restore from RDS snapshots).
- **Incident Mitigation:** [Incident Response Runbook](./03-incident-response-runbook.md) (How to handle API 500s, Worker queue backlogs).
- **Capacity Planning:** [Scaling Runbook](./04-scaling-runbook.md) (How to manually scale ECS tasks or upgrade RDS instance sizes).
- **Team Access:** [Onboarding Runbook](./05-onboarding-runbook.md) (How to grant access to a new hire).
- **Debugging:** [Troubleshooting Guide](./06-troubleshooting-guide.md) (Common developer environment issues).
- **Disaster Recovery:** [Rollback Procedures](./07-rollback-procedures.md) (Full system state rollback).

---

## Runbook Rules

1. **Test Them:** A runbook that has not been tested in Staging in the last 6 months is considered invalid.
2. **Keep it Simple:** Use exact AWS CLI commands or Terraform apply steps. Do not use vague language like "Update the config."
3. **Link to Dashboards:** Every runbook should link to the specific Grafana dashboard used to verify if the fix actually worked.

---

## Related Documents

- **Project Management:** [Incident Response](../13-project-management-management/05-incident-response.md)
- **Index:** [IEKB Master Index](../00-foundation/00-IEKB-index.md)

