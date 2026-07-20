# Architecture Decision Records (ADRs)

> **IEKB Section:** 14 — Project Management  
> **Document:** 07-architecture-decision-records.md  
> **Last Updated:** 2026-07-16  
> **Owner:** Tech Lead  
> **Status:** Approved

---

## Table of Contents

1. [What is an ADR?](#what-is-an-adr)
2. [When to write an ADR](#when-to-write-an-adr)
3. [The ADR Template](#the-adr-template)
4. [Related Documents](#related-documents)

---

## What is an ADR?

An Architecture Decision Record (ADR) is a short markdown document that captures a single, highly significant architectural decision along with its context and consequences.

When a new engineer joins the team 2 years from now and asks, "Why did we choose PostgreSQL over MongoDB?" or "Why did we write this in Express instead of NestJS?", the answer should be immediately available in the ADR folder, completely removing ambiguity and preventing repetitive debates.

---

## When to write an ADR

Write an ADR when a decision:
- Introduces a new foundational technology (e.g., adding Redis to the stack).
- Irreversibly changes the data model (e.g., choosing Shared Schema Multi-Tenancy over Database-per-Tenant).
- Significantly impacts deployment or operational costs (e.g., moving from AWS ECS to EKS).

Do **not** write an ADR for trivial choices (e.g., choosing `date-fns` over `moment.js`, or naming a CSS class).

---

## The ADR Template

All ADRs are stored in the `/docs/adrs` folder in the root repository. They are numbered sequentially (e.g., `001-use-postgresql.md`).

```markdown
# 1. Use PostgreSQL for Primary Data Store

Date: 2026-07-16
Status: Accepted

## Context
We need a primary database to store Organizations, Users, Assets, and Incidents. The data is highly relational, requires strict ACID transactions, and will eventually be queried using complex joins for reporting.

## Decision
We will use PostgreSQL (specifically AWS RDS Multi-AZ).

## Consequences
- **Positive:** Guaranteed data integrity, excellent support for JSONB if we need semi-structured data, built-in row-level security capabilities, and native support in Prisma.
- **Negative:** Harder to horizontally scale writes compared to a NoSQL database like DynamoDB. Schema migrations require careful planning to avoid table locks.
```

---

## Related Documents

- **Database Choice:** [Database Architecture](../01-database/00-schema-design.md)
- **Tenancy Choice:** [Tenancy Overview](../11-multi-tenancy/00-tenancy-overview.md)
- **Index:** [IEKB Master Index](../00-foundation/00-IEKB-index.md)

