# Project Charter

> **IEKB Section:** 14 — Project Management  
> **Document:** 00-project-charter.md  
> **Last Updated:** 2026-07-16  
> **Owner:** Engineering Manager  
> **Status:** Approved

---

## Table of Contents

1. [Project Vision](#project-vision)
2. [Target Audience](#target-audience)
3. [Key Milestones (V0 to V2)](#key-milestones-v0-to-v2)
4. [Roles & Responsibilities](#roles--responsibilities)

---

## Project Vision

**InfraWatch** is a B2B SaaS platform designed to modernize the management, inspection, and maintenance of physical enterprise infrastructure (HVAC, electrical grids, plumbing, industrial manufacturing).

By replacing fragmented paper checklists and disjointed email threads with a centralized, real-time platform, InfraWatch reduces compliance risk and sets the foundation for predictive, AI-driven maintenance.

---

## Target Audience

1. **Inspectors / Field Technicians:** The primary users. They need a fast, offline-capable mobile interface to log conditions, take photos, and report incidents from the field.
2. **Facility Managers:** The operational layer. They need Kanban boards to track open incidents, assign workers, and generate compliance reports.
3. **Executive Stakeholders:** The business layer. They need high-level dashboard metrics to understand failure rates, repair costs, and overall infrastructure health.

---

## Key Milestones (V0 to V2)

- **V0 (Current): The Data Foundation.** A deterministic CRUD application. Focus is on manual inspections, multi-tenancy, and reliable data capture.
- **V1 (Q4 2026): The Intelligence Layer.** Introduction of Human-in-the-Loop AI. NLP for incident triage, Computer Vision for rust/leak detection, and LLMs for narrative reporting.
- **V2 (Q2 2027): The Predictive Layer.** Integration of continuous IoT sensor telemetry and time-series forecasting to enable Predictive Maintenance.

---

## Roles & Responsibilities

- **Product Manager:** Defines business requirements, prioritizes the Jira backlog.
- **Engineering Manager:** Responsible for delivery, sprint velocity, and unblocking the team.
- **Tech Lead:** Owns the architectural decisions (recorded in ADRs) and code review standards.
- **QA Lead:** Ensures the testing pyramid (Unit, Integration, E2E) is strictly adhered to.

---

## Related Documents

- **Git Strategy:** [Git Workflow](./01-git-workflow.md)
- **Architecture:** [ADRs](./07-architecture-decision-records.md)
- **Index:** [IEKB Master Index](../00-foundation/00-IEKB-index.md)
