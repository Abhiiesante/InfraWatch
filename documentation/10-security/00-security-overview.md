# Security Overview

> **IEKB Section:** 11 — Security  
> **Document:** 00-security-overview.md  
> **Last Updated:** 2026-07-16  
> **Owner:** Security Lead  
> **Status:** Approved

---

## Table of Contents

1. [Security Posture](#security-posture)
2. [Defense in Depth](#defense-in-depth)
3. [Key Security Principles](#key-security-principles)
4. [Related Documents](#related-documents)

---

## Security Posture

InfraWatch handles physical infrastructure metadata, camera streams, and compliance reports. While it does not process PCI (credit card) or HIPAA (health) data, the exposure of physical asset locations and vulnerabilities is a high-severity risk for our enterprise clients.

Our security posture relies on **Defense in Depth** and **Zero Trust Architecture**. No single security measure is trusted to prevent a breach entirely; instead, multiple independent layers of security controls must be bypassed to access sensitive data.

---

## Defense in Depth

Our architecture is secured at every layer:

1. **Network Layer:** VPC with private subnets for data, strict Security Groups, and AWS WAF (Web Application Firewall) protecting the Application Load Balancer.
2. **Infrastructure Layer:** ECS Fargate tasks running as non-root users, automated OS patching by AWS, and IAM role isolation.
3. **Application Layer:** Express middleware enforcing strict Multi-Tenancy (a Prisma Client Extension auto-injects `tenantId` on every tenant-scoped query), Rate Limiting, and CORS.
4. **Data Layer:** PostgreSQL Row-Level Security (RLS) policies enforce tenant isolation independently of the application layer (see [Tenant Scoping](../11-multi-tenancy/01-prisma-rls-extensions.md)). Encryption at rest (AES-256) for RDS, ElastiCache, and S3. Encryption in transit (TLS 1.2+) everywhere.
5. **CI/CD Layer:** Automated SAST and SCA scanning on every Pull Request.

---

## Key Security Principles

- **Least Privilege:** Services and users are granted only the permissions absolutely necessary to perform their functions.
- **Fail Securely:** When a process fails or encounters an error, it must default to denying access, not granting it.
- **Secure by Default:** Security configurations (like HTTPS redirection, secure cookies) are enabled by default and require explicit (and reviewed) action to disable.

---

## Related Documents

- **AWS Security:** [IAM Roles & Policies](./01-iam-roles.md)
- **Application:** [CORS & CSP Headers](./03-cors-csp-headers.md)
- **Index:** [IEKB Master Index](../00-foundation/00-IEKB-index.md)
