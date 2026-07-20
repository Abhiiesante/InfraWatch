# IAM Roles & Execution Contexts

> **IEKB Section:** 11 — Security  
> **Document:** 01-iam-roles.md  
> **Last Updated:** 2026-07-16  
> **Owner:** DevOps Lead  
> **Status:** Approved

---

## Table of Contents

1. [Overview](#overview)
2. [ECS Execution Role vs Task Role](#ecs-execution-role-vs-task-role)
3. [Example: ECS Task Role](#example-ecs-task-role)
4. [Related Documents](#related-documents)

---

## Overview

In AWS, we strictly adhere to the principle of least privilege using Identity and Access Management (IAM). 

We never embed AWS Access Keys (AKIA...) directly into our `.env` files or application code. Instead, we assign IAM Roles directly to the computing environment (ECS Fargate containers), allowing the AWS SDKs to automatically and securely fetch temporary credentials at runtime.

---

## ECS Execution Role vs Task Role

When configuring ECS Fargate, two distinct roles are required:

1. **ECS Execution Role:** This role is assumed by the *AWS ECS agent* itself to pull the Docker image from ECR and fetch sensitive secrets from AWS Secrets Manager to inject as environment variables during container boot. The application code *never* uses this role.
2. **ECS Task Role:** This role is assumed by the *application code* (Node.js) running inside the container. It grants permissions to AWS services that the application needs to talk to (e.g., S3, SES, X-Ray).

---

## Example: ECS Task Role

Below is the Terraform definition for the API's Task Role. Notice how it is scoped specifically to the resources it needs.

```hcl
# infrastructure/terraform/iam.tf

resource "aws_iam_role" "ecs_task_role" {
  name = "infrawatch-${var.environment}-api-task-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })
}

# Allow the API to generate pre-signed URLs and put/get objects in the specific assets bucket
resource "aws_iam_role_policy" "s3_assets_policy" {
  name = "S3AssetsAccess"
  role = aws_iam_role.ecs_task_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:DeleteObject"
        ]
        Effect   = "Allow"
        Resource = "arn:aws:s3:::infrawatch-assets-${var.environment}/*"
      }
    ]
  })
}

# Allow ADOT sidecar to push traces to X-Ray
resource "aws_iam_role_policy_attachment" "xray_policy" {
  role       = aws_iam_role.ecs_task_role.name
  policy_arn = "arn:aws:iam::aws:policy/AWSXRayDaemonWriteAccess"
}
```

---

## Related Documents

- **Architecture:** [Security Overview](./00-security-overview.md)
- **DevOps:** [ECS Fargate Setup](../08-devops/09-terraform-ecs.md)
- **Index:** [IEKB Master Index](../00-foundation/00-IEKB-index.md)
