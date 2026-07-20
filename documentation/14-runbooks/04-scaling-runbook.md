# Scaling Runbook

> **IEKB Section:** 15 — Runbooks  
> **Document:** 04-scaling-runbook.md  
> **Last Updated:** 2026-07-16  
> **Owner:** DevOps Lead  
> **Status:** Approved

---

## Table of Contents

1. [Manual ECS Scaling (Horizontal)](#manual-ecs-scaling-horizontal)
2. [RDS Scaling (Vertical)](#rds-scaling-vertical)
3. [Auto-Scaling Triggers](#auto-scaling-triggers)
4. [Related Documents](#related-documents)

---

## Manual ECS Scaling (Horizontal)

If there is an unexpected spike in traffic (e.g., a massive influx of field inspections) and CPU utilization hits 90%, you may need to manually increase the container count before Auto-Scaling kicks in.

**Via AWS CLI:**
```bash
# Scale the API to 10 instances immediately
aws ecs update-service \
  --cluster infrawatch-prod-cluster \
  --service infrawatch-api-service \
  --desired-count 10
```
*Note: This is a temporary fix. Terraform will revert this change on the next deployment unless you also update the `desired_count` variable in the `.tfvars` file.*

---

## RDS Scaling (Vertical)

PostgreSQL (RDS) cannot easily be scaled horizontally for writes. If the database is hitting 95% CPU or exhausting connection limits, you must scale it vertically (increase instance size).

**This action requires 5-10 minutes of downtime as the instance reboots.** Do not do this during peak hours unless absolutely necessary.

1. **Update Terraform:**
   ```hcl
   # Change from db.t3.medium to db.m5.large
   instance_class = "db.m5.large"
   ```
2. **Apply the Change:**
   ```bash
   terraform apply
   ```
   Terraform will apply the change immediately (since `apply_immediately = true` is set in our production module). The database will reboot.

---

## Auto-Scaling Triggers

Normally, you should not need to manually scale ECS.

Our Auto-Scaling Target Tracking policies are configured in Terraform:
- **Scale Out (Add tasks):** When average CPU > 70% for 3 minutes.
- **Scale In (Remove tasks):** When average CPU < 30% for 15 minutes.

If scaling is happening too slowly, adjust the `scale_out_cooldown` and `scale_in_cooldown` parameters in the ECS Terraform module.

---

## Related Documents

- **DevOps:** [Terraform ECS](../08-devops/09-terraform-ecs.md)
- **DevOps:** [Terraform RDS](../08-devops/07-terraform-rds.md)
- **Index:** [IEKB Master Index](../00-foundation/00-IEKB-index.md)
