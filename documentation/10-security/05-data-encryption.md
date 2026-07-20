# Data Encryption

> **IEKB Section:** 11 — Security  
> **Document:** 05-data-encryption.md  
> **Last Updated:** 2026-07-16  
> **Owner:** Security Lead  
> **Status:** Approved

---

## Table of Contents

1. [Encryption in Transit](#encryption-in-transit)
2. [Encryption at Rest](#encryption-at-rest)
3. [Field-Level Encryption (Future Proofing)](#field-level-encryption-future-proofing)
4. [Related Documents](#related-documents)

---

## Encryption in Transit

All data traveling over a network must be encrypted using TLS 1.2 or higher.

1. **Client to ALB (Public Internet):** The AWS Application Load Balancer is configured with an ACM (AWS Certificate Manager) SSL/TLS certificate. It terminates the HTTPS connection. HTTP traffic on port 80 is strictly redirected to 443.
2. **ALB to ECS (Internal VPC):** For V0, traffic between the ALB and ECS Fargate runs over unencrypted HTTP on port 3000 within the private VPC. Because the VPC is isolated from the internet, this is an acceptable tradeoff for performance vs maintaining internal certificates.
3. **ECS to RDS/Redis/S3:** All connections from the backend to AWS managed services use TLS via the AWS SDKs and `sslmode=require` for PostgreSQL.

---

## Encryption at Rest

If a physical hard drive is stolen from an AWS data center, the data must be unreadable.

We rely entirely on AWS KMS (Key Management Service) managed keys for V0:
- **RDS:** `storage_encrypted = true` in Terraform. Uses AES-256 block-level encryption.
- **ElastiCache:** `at_rest_encryption_enabled = true`.
- **S3:** All buckets use SSE-S3 (Server-Side Encryption with Amazon S3 managed keys) by default.

---

## Field-Level Encryption (Future Proofing)

For V0, we do **not** implement Application/Field-Level Encryption (where Node.js encrypts specific strings like an Asset's Serial Number before saving it to the database). 

While highly secure, Field-Level Encryption breaks standard database searching and sorting (you cannot run `WHERE serialNumber LIKE '%123%'` on an encrypted column). If Enterprise clients require this in V1, we will implement the Prisma Client Encryption middleware.

---

## Related Documents

- **Architecture:** [Security Overview](./00-security-overview.md)
- **Infrastructure:** [Terraform RDS](../08-devops/07-terraform-rds.md)
- **Index:** [IEKB Master Index](../00-foundation/00-IEKB-index.md)
