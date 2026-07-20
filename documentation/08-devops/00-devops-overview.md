# DevOps & Infrastructure Overview

> **IEKB Section:** 08 — DevOps  
> **Document:** 00-devops-overview.md  
> **Last Updated:** 2026-07-16  
> **Owner:** Lead DevOps Engineer  
> **Status:** Approved

---

## Table of Contents

1. [Infrastructure Philosophy](#infrastructure-philosophy)
2. [Target Architecture (V0)](#target-architecture-v0)
3. [Environments](#environments)
4. [Toolchain](#toolchain)
5. [Related Documents](#related-documents)

---

## Infrastructure Philosophy

For V0, InfraWatch prioritizes **reliability, security, and developer velocity** over massive hyper-scale capabilities. We are building a B2B SaaS platform that must be rock-solid, but we are not expecting Netflix-level traffic on day one.

Therefore, we have chosen a **Containerized Monolith on AWS Fargate (ECS)**. This provides the isolation and reproducible builds of Docker, without the immense operational overhead of managing a custom Kubernetes (EKS) cluster.

---

## Target Architecture (V0)

The production architecture runs entirely within a Virtual Private Cloud (VPC) on AWS:

1. **Frontend Hosting:** Static assets hosted on Amazon S3 and distributed globally via Amazon CloudFront (CDN).
2. **Compute:** Serverless containers running on AWS ECS Fargate.
   - `api-service` (Express HTTP Server)
   - `worker-service` (BullMQ Worker)
3. **Load Balancing:** AWS Application Load Balancer (ALB) routing HTTP traffic to the `api-service`.
4. **Primary Database:** Amazon RDS for PostgreSQL (Multi-AZ deployment for high availability).
5. **Message Broker/Cache:** Amazon ElastiCache for Redis (Used by BullMQ and rate limiting).
6. **Object Storage:** Amazon S3 for user-uploaded images and generated PDFs.

---

## Environments

We maintain three distinct, isolated environments (separate AWS Accounts via AWS Organizations):

1. **Development (Local):** Runs on developer laptops using `docker-compose`.
2. **Staging:** An exact replica of Production, scaled down. Automated E2E and DAST security tests run here. Connected to a staging database.
3. **Production:** The live customer environment. Multi-AZ enabled. Strict IAM access controls.

---

## Toolchain

- **Infrastructure as Code (IaC):** Terraform
- **Containerization:** Docker
- **CI/CD:** GitHub Actions
- **Container Registry:** Amazon Elastic Container Registry (ECR)
- **Secrets Management:** AWS Secrets Manager

---

## Related Documents

- **Docker:** [Backend Dockerfile](./01-dockerfile-backend.md)
- **AWS:** [AWS Architecture Deep Dive](./05-aws-architecture.md)
- **Index:** [IEKB Master Index](../00-foundation/00-IEKB-index.md)
