# Database Operations Runbook

> **IEKB Section:** 15 — Runbooks  
> **Document:** 02-database-runbook.md  
> **Last Updated:** 2026-07-16  
> **Owner:** Database Administrator  
> **Status:** Approved

---

## Table of Contents

1. [Connecting to Production RDS](#connecting-to-production-rds)
2. [Manually Applying a Migration](#manually-applying-a-migration)
3. [Restoring from an RDS Snapshot](#restoring-from-an-rds-snapshot)
4. [Related Documents](#related-documents)

---

## Connecting to Production RDS

The production RDS instance resides in a private VPC subnet and is not accessible from the public internet. To connect securely, you must use AWS Systems Manager (SSM) Session Manager to tunnel through a Bastion Host.

1. **Start the Port Forwarding Session:**
   ```bash
   aws ssm start-session \
     --target i-0abcd1234efgh5678 \
     --document-name AWS-StartPortForwardingSessionToRemoteHost \
     --parameters '{"portNumber":["5432"],"localPortNumber":["5432"],"host":["infrawatch-prod.cluster-xyz.us-east-1.rds.amazonaws.com"]}'
   ```
2. **Connect via psql locally:**
   ```bash
   psql -h localhost -p 5432 -U infrawatch_admin -d infrawatch_prod
   ```

---

## Manually Applying a Migration

If the GitHub Actions CI pipeline fails to apply a Prisma migration during the Release Phase, you must apply it manually using the bastion tunnel established above.

1. Set your local `.env` to point to the tunneled port:
   `DATABASE_URL="postgresql://infrawatch_admin:PASSWORD@localhost:5432/infrawatch_prod"`
2. Run the deploy command from your local machine:
   ```bash
   npx prisma migrate deploy
   ```
3. *Verify:* Check the `_prisma_migrations` table in the database to ensure the migration was marked as applied.

---

## Restoring from an RDS Snapshot

If a developer accidentally drops a production table, a PR revert will not save the data. You must restore from the automated AWS RDS snapshot.

1. **Identify the Point in Time:** AWS RDS supports Point-In-Time-Recovery (PITR) down to the second for the last 7 days.
2. **Restore to a NEW Instance:** You cannot restore a snapshot directly over the existing live database.
   ```bash
   aws rds restore-db-cluster-to-point-in-time \
     --source-db-cluster-identifier infrawatch-prod-cluster \
     --target-db-cluster-identifier infrawatch-prod-cluster-restored \
     --restore-to-time "2026-07-16T12:00:00Z"
   ```
3. **Update Terraform / Secrets Manager:**
   - Once the new cluster is `AVAILABLE`, update the Terraform state or AWS Secrets Manager to point the `DATABASE_URL` to the new cluster's endpoint.
   - Force a restart of the ECS tasks (see [Deployment Runbook](./01-deployment-runbook.md)) so they pick up the new connection string.
4. **Clean up:** Delete the old corrupted cluster only after verifying the restored cluster is fully operational.

---

## Related Documents

- **Database:** [Migrations CI](../08-devops/11-database-migrations-ci.md)
- **Index:** [IEKB Master Index](../00-foundation/00-IEKB-index.md)
