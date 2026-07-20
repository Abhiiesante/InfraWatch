# Secrets Management

> **IEKB Section:** 11 — Security  
> **Document:** 02-secrets-management.md  
> **Last Updated:** 2026-07-16  
> **Owner:** Security Lead  
> **Status:** Approved

---

## Table of Contents

1. [Overview](#overview)
2. [AWS Secrets Manager](#aws-secrets-manager)
3. [ECS Injection](#ecs-injection)
4. [Developer Environment](#developer-environment)
5. [Related Documents](#related-documents)

---

## Overview

A "Secret" is any piece of data that, if exposed, could lead to unauthorized access (e.g., Database Passwords, JWT Secret Keys, API Keys for third-party services).

**Rule #1:** Secrets must NEVER be committed to version control.
**Rule #2:** Secrets must NEVER be hardcoded in Dockerfiles or Terraform state files in plaintext.

---

## AWS Secrets Manager

In production, all secrets are stored in **AWS Secrets Manager**. Secrets are encrypted at rest using AWS KMS.

We manage the *creation* of the secret placeholder via Terraform, but the actual *value* of the secret is populated manually via the AWS Console or AWS CLI by an administrator. This ensures Terraform state files do not contain production passwords.

```hcl
# infrastructure/terraform/secrets.tf

resource "aws_secretsmanager_secret" "db_url" {
  name        = "infrawatch-${var.environment}-database-url"
  description = "PostgreSQL Connection String"
}

resource "aws_secretsmanager_secret" "jwt_secret" {
  name        = "infrawatch-${var.environment}-jwt-secret"
  description = "Key used to sign JWTs"
}
```

---

## ECS Injection

The ECS Execution Role is granted permission to read these specific secrets. During container startup, the ECS agent fetches the secret from Secrets Manager and injects it as an environment variable into the Node.js process.

```hcl
# Inside aws_ecs_task_definition container_definitions:
secrets = [
  {
    name      = "DATABASE_URL"
    valueFrom = aws_secretsmanager_secret.db_url.arn
  },
  {
    name      = "JWT_SECRET"
    valueFrom = aws_secretsmanager_secret.jwt_secret.arn
  }
]
```

This ensures that:
1. The secret is only in memory while the container is running.
2. The Node.js application accesses it normally via `process.env.DATABASE_URL`.
3. If the container is compromised, the attacker only gets the secrets currently in memory, not the master key.

---

## Developer Environment

For local development, developers use a `.env` file at the root of the `/backend` directory.

- The `.env` file is heavily `.gitignore`d.
- A `.env.example` file is committed to the repository containing placeholder values to guide new developers on what keys are required.

---

## Related Documents

- **Architecture:** [Security Overview](./00-security-overview.md)
- **DevOps:** [ECS Task Definitions](../08-devops/09-terraform-ecs.md)
- **Index:** [IEKB Master Index](../00-foundation/00-IEKB-index.md)
