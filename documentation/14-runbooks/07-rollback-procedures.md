# Disaster Recovery & Rollback Procedures

> **IEKB Section:** 15 — Runbooks  
> **Document:** 07-rollback-procedures.md  
> **Last Updated:** 2026-07-16  
> **Owner:** DevOps Lead  
> **Status:** Approved

---

## Table of Contents

1. [Overview](#overview)
2. [Level 1: Code Revert](#level-1-code-revert)
3. [Level 2: Terraform State Revert](#level-2-terraform-state-revert)
4. [Level 3: Full Region Failover](#level-3-full-region-failover)
5. [Related Documents](#related-documents)

---

## Overview

A "Rollback" can mean reversing a small code change, or it can mean reconstructing the entire AWS infrastructure after a catastrophic region failure (Disaster Recovery).

This document outlines the three levels of Rollback severity.

---

## Level 1: Code Revert
**Scenario:** A bug in the Express API is causing 500s.
**Action:** Revert the PR in GitHub. See [Deployment Runbook](./01-deployment-runbook.md).
**Expected Downtime:** ~5 minutes (CI/CD execution time).

---

## Level 2: Terraform State Revert
**Scenario:** A bad Terraform apply deleted a critical Security Group or ALB listener.
**Action:** 
1. Do not manually click around the AWS Console to fix it. This creates drift.
2. Revert the Terraform PR in GitHub.
3. Rerun `terraform apply` locally or via CI to force AWS infrastructure to match the reverted `.tf` files.
**Expected Downtime:** ~10-15 minutes.

---

## Level 3: Full Region Failover
**Scenario:** `us-east-1` (N. Virginia) experiences a total catastrophic outage. ECS, RDS, and ElastiCache are completely unavailable.

**Action (Disaster Recovery):**
InfraWatch V0 is a Single-Region architecture, but we prepare for DR.

1. **Database:** RDS is configured for Multi-AZ, but if the entire region drops, we must rely on Cross-Region Snapshots (if enabled) to spin up a new RDS cluster in `us-west-2`.
2. **Infrastructure:** Because 100% of our infrastructure is defined in Terraform, we simply change the `aws_region` variable in our `terraform/variables.tf` to `us-west-2` and run `terraform apply`. This will spin up a fresh VPC, ECS cluster, and ALB in the new region in roughly 20 minutes.
3. **DNS:** Update the Route53 alias for `api.infrawatch.com` to point to the new ALB in `us-west-2`.
**Expected Downtime:** 1-4 hours (Depending on DNS propagation and DB snapshot size).

---

## Related Documents

- **Runbooks:** [Deployment Runbook](./01-deployment-runbook.md)
- **DevOps:** [Terraform Base Infrastructure](../08-devops/06-terraform-vpc-sg.md)
- **Index:** [IEKB Master Index](../00-foundation/00-IEKB-index.md)
