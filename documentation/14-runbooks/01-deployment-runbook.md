# Deployment & Rollback Runbook

> **IEKB Section:** 15 — Runbooks  
> **Document:** 01-deployment-runbook.md  
> **Last Updated:** 2026-07-16  
> **Owner:** DevOps Lead  
> **Status:** Approved

---

## Scenario 1: Manual Production Deployment

Normally, deployments happen automatically when a PR is merged to `main`. If GitHub Actions is failing or you need to force a deployment from a specific SHA:

1. **Authenticate to AWS:**
   ```bash
   aws sso login --profile infrawatch-prod
   ```
2. **Build and Push the Image manually:**
   ```bash
   # Make sure you are on the correct commit
   git checkout <target_sha>
   
   # Log into ECR
   aws ecr get-login-password | docker login --username AWS --password-stdin <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com
   
   # Build and push API
   docker build -t infrawatch-api -f backend/Dockerfile.api .
   docker tag infrawatch-api:latest <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/infrawatch-api:<target_sha>
   docker push <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/infrawatch-api:<target_sha>
   ```
3. **Force ECS to update (Assuming you pushed a new image with the tag expected by the Task Definition, usually `latest` or the SHA tied in Terraform):**
   ```bash
   aws ecs update-service --cluster infrawatch-prod-cluster --service infrawatch-api-service --force-new-deployment
   ```

---

## Scenario 2: Emergency Code Rollback

If a new deployment introduces a Sev 1 bug, roll back the code immediately. **Do not try to fix the bug forward on `main` if the fix takes longer than 5 minutes.**

1. **Revert the PR in GitHub:**
   - Go to the offending PR on GitHub.
   - Click the "Revert" button.
   - Merge the revert PR into `main` immediately (bypass approvals using Admin privileges if necessary).
2. **Wait for CI:**
   - GitHub Actions will automatically build the reverted state and deploy it to ECS.
3. **Verify:**
   - Watch the ECS console to ensure the new tasks (running the old code) reach `RUNNING` state.
   - Check the [Grafana API Health Dashboard](https://grafana.infrawatch.com/d/api-health) to ensure 500 errors drop to zero.

---

## Related Documents

- **DevOps:** [GitHub Actions Deploy](../08-devops/10-github-actions-deploy.md)
- **Index:** [IEKB Master Index](../00-foundation/00-IEKB-index.md)
