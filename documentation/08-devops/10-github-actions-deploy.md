# GitHub Actions Deploy Pipeline

> **IEKB Section:** 08 — DevOps  
> **Document:** 10-github-actions-deploy.md  
> **Last Updated:** 2026-07-16  
> **Owner:** DevOps Engineer  
> **Status:** Approved

---

## Table of Contents

1. [Overview](#overview)
2. [OIDC Authentication](#oidc-authentication)
3. [Deployment Workflow (Backend)](#deployment-workflow-backend)
4. [Deployment Workflow (Frontend)](#deployment-workflow-frontend)
5. [Related Documents](#related-documents)

---

## Overview

We use **GitHub Actions** for Continuous Deployment (CD). Once a Pull Request is merged into `main`, the deployment pipeline automatically runs. It builds the Docker images, pushes them to Amazon ECR, and updates the ECS services.

Terraform is used to provision the infrastructure *before* deployment, while GitHub Actions handles the day-to-day code updates.

---

## OIDC Authentication

We do **not** store long-lived AWS IAM Access Keys as GitHub Secrets. Instead, we use **OpenID Connect (OIDC)**. GitHub Actions assumes an IAM Role dynamically using short-lived credentials, significantly reducing security risks.

```yaml
# .github/workflows/deploy.yml
permissions:
  id-token: write # Required for OIDC
  contents: read
```

---

## Deployment Workflow (Backend)

The backend deployment updates the API and Worker ECS services.

```yaml
name: Deploy Backend
on:
  push:
    branches: [ main ]
    paths:
      - 'backend/**' # Only run if backend code changed

env:
  AWS_REGION: us-east-1
  ECR_REPOSITORY: infrawatch-api

jobs:
  deploy:
    name: Build & Deploy to ECS
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Configure AWS credentials via OIDC
        uses: aws-actions/configure-aws-credentials@v2
        with:
          role-to-assume: arn:aws:iam::123456789012:role/GitHubActionsDeployRole
          aws-region: ${{ env.AWS_REGION }}

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v1

      - name: Build, tag, and push API image
        id: build-api
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          cd backend
          docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG .
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
          echo "api_image=$ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG" >> $GITHUB_OUTPUT

      # Download the current task definition from ECS
      - name: Download task definition
        run: |
          aws ecs describe-task-definition --task-definition infrawatch-production-api --query taskDefinition > task-def.json

      # Update the JSON with the new image tag
      - name: Render new task definition
        id: render-api-container
        uses: aws-actions/amazon-ecs-render-task-definition@v1
        with:
          task-definition: task-def.json
          container-name: api
          image: ${{ steps.build-api.outputs.api_image }}

      # Deploy the new task definition to the service
      - name: Deploy to Amazon ECS
        uses: aws-actions/amazon-ecs-deploy-task-definition@v1
        with:
          task-definition: ${{ steps.render-api-container.outputs.task-definition }}
          service: infrawatch-production-api-service
          cluster: infrawatch-production-cluster
          wait-for-service-stability: true
```

*(Note: The Worker service follows the exact same pattern, but uses `Dockerfile.worker`).*

---

## Deployment Workflow (Frontend)

The frontend deployment pushes the static assets to S3 and invalidates the CloudFront cache.

```yaml
name: Deploy Frontend
on:
  push:
    branches: [ main ]
    paths:
      - 'frontend/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with: { node-version: '18' }
        
      - name: Build Frontend
        run: |
          cd frontend
          npm ci
          npm run build
        env:
          VITE_API_URL: https://api.infrawatch.com/v1

      - name: Configure AWS credentials via OIDC
        uses: aws-actions/configure-aws-credentials@v2
        with:
          role-to-assume: arn:aws:iam::123456789012:role/GitHubActionsDeployRole
          aws-region: us-east-1

      - name: Sync to S3
        run: aws s3 sync ./frontend/dist s3://infrawatch-frontend-production --delete

      - name: Invalidate CloudFront
        run: aws cloudfront create-invalidation --distribution-id E1XXXXXXXXXX --paths "/*"
```

---

## Related Documents

- **Architecture:** [AWS Architecture](./05-aws-architecture.md)
- **Database CI:** [Database Migrations in CI](./11-database-migrations-ci.md)
- **Index:** [IEKB Master Index](../00-foundation/00-IEKB-index.md)
