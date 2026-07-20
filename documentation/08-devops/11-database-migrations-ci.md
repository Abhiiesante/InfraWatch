# Database Migrations in CI/CD

> **IEKB Section:** 08 — DevOps  
> **Document:** 11-database-migrations-ci.md  
> **Last Updated:** 2026-07-16  
> **Owner:** DevOps Engineer  
> **Status:** Approved

---

## Table of Contents

1. [Overview](#overview)
2. [The Release Phase pattern](#the-release-phase-pattern)
3. [Prisma Migrate Deploy](#prisma-migrate-deploy)
4. [Rollback Strategy](#rollback-strategy)
5. [Related Documents](#related-documents)

---

## Overview

Applying database migrations in a distributed container environment is tricky. If multiple API containers boot up at the same time and attempt to run `prisma migrate deploy`, it can cause race conditions or database locks.

Furthermore, migrations must be executed *before* the new application code starts receiving traffic.

---

## The Release Phase pattern

We utilize a "Release Phase" or "Pre-Deploy Hook". Instead of having the ECS API tasks run migrations on startup (e.g., `CMD ["npm", "run", "start:with-migrations"]`), we configure GitHub Actions to execute a standalone, ephemeral task strictly for migrations before updating the main ECS service.

### GitHub Actions Integration

```yaml
# Inside .github/workflows/deploy.yml, just before the `amazon-ecs-deploy-task-definition` step:

      # We create a specific task definition in Terraform meant only for running migrations.
      # It uses the exact same Docker image, but overrides the CMD to run `prisma migrate deploy`.
      - name: Run Database Migrations
        run: |
          aws ecs run-task \
            --cluster infrawatch-production-cluster \
            --task-definition infrawatch-production-migration-task \
            --launch-type FARGATE \
            --network-configuration "awsvpcConfiguration={subnets=[subnet-123,subnet-456],securityGroups=[sg-789]}" \
            --overrides '{"containerOverrides":[{"name":"api","command":["npx","prisma","migrate","deploy"]}]}' \
            --started-by "GitHubActions"
            
      # The above command is asynchronous. We must wait for it to complete successfully.
      # (Implementation detail omitted for brevity: A script polling `aws ecs describe-tasks` until status is STOPPED and exitCode is 0)
```

---

## Prisma Migrate Deploy

In production, we strictly use `npx prisma migrate deploy`.

Unlike `migrate dev`, which resets the database if it detects drift, `deploy` only applies pending migrations found in the `prisma/migrations` directory and records them in the `_prisma_migrations` table. It will fail safely if it detects a conflict.

---

## Rollback Strategy

Because Prisma does not natively support "down" migrations (rolling back an applied migration), rolling back a deployment requires care:

1. **Backwards Compatible Changes:** Developers are instructed to make all database schema changes backwards compatible (e.g., adding a nullable column before making it required in a future release).
2. **Reverting Code:** If a bug is found in the code, simply reverting the Git commit and letting CI redeploy the old code is safe because the database schema changes were backwards compatible.
3. **Database Restore:** If a catastrophic migration destroys data (e.g., dropping a critical table by accident), we must rely on AWS RDS Point-in-Time Recovery (PITR) to restore the database to the exact minute before the migration ran.

---

## Related Documents

- **Architecture:** [DevOps Overview](./00-devops-overview.md)
- **Deployment:** [GitHub Actions Deploy](./10-github-actions-deploy.md)
- **Database:** [Prisma Setup](../01-database/01-prisma-setup.md)
- **Index:** [IEKB Master Index](../00-foundation/00-IEKB-index.md)
