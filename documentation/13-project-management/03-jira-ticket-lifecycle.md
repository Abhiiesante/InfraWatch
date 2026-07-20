# Jira Ticket Lifecycle

> **IEKB Section:** 14 — Project Management  
> **Document:** 03-jira-ticket-lifecycle.md  
> **Last Updated:** 2026-07-16  
> **Owner:** Product Manager  
> **Status:** Approved

---

## Table of Contents

1. [Ticket Types](#ticket-types)
2. [The Workflow States](#the-workflow-states)
3. [Definition of Done (DoD)](#definition-of-done-dod)
4. [Related Documents](#related-documents)

---

## Ticket Types

- **Epic:** A large, cross-cutting feature (e.g., "AI Incident Triage"). Epics span multiple sprints.
- **Story:** A user-facing feature that delivers business value (e.g., "As a Manager, I want to filter incidents by status").
- **Task:** A technical chore with no direct user value (e.g., "Upgrade to Node 20").
- **Bug:** A defect in production or staging.

---

## The Workflow States

1. **Backlog:** Ticket is created but not prioritized.
2. **To Do:** Ticket is pulled into the active Sprint. It must have Acceptance Criteria and Story Points (Fibonacci scale).
3. **In Progress:** A developer is actively working on a branch for this ticket.
4. **In Review:** The PR is open. CI is running. Waiting for a peer review.
5. **In QA (Staging):** The PR has been merged into `main` and deployed to the Staging environment. The QA Lead (or PM) manually verifies the Acceptance Criteria.
6. **Done:** The feature is live in Production.

---

## Definition of Done (DoD)

A ticket is NOT "Done" when the code works locally. A ticket is only "Done" when:

1. Code is merged into `main`.
2. All Acceptance Criteria in the Jira ticket are met.
3. Unit, Integration, and E2E tests are written and passing in CI.
4. The feature is deployed to Production.
5. If required, a Feature Toggle is active.
6. End-user documentation (if applicable) is updated.

---

## Related Documents

- **Git Strategy:** [Git Workflow](./01-git-workflow.md)
- **Deployment:** [Release Management](./04-release-management.md)
- **Index:** [IEKB Master Index](../00-foundation/00-IEKB-index.md)
