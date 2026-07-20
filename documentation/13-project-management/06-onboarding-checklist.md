# Engineer Onboarding Checklist

> **IEKB Section:** 14 — Project Management  
> **Document:** 06-onboarding-checklist.md  
> **Last Updated:** 2026-07-16  
> **Owner:** Engineering Manager  
> **Status:** Approved

---

## Table of Contents

1. [Day 1: Access & Hardware](#day-1-access--hardware)
2. [Day 2: Local Environment Setup](#day-2-local-environment-setup)
3. [Day 3: The First PR](#day-3-the-first-pr)
4. [Related Documents](#related-documents)

---

## Day 1: Access & Hardware

- [ ] Receive company laptop (MacBook Pro standard).
- [ ] Log into Google Workspace (Email/Calendar).
- [ ] Log into Slack. Join `#eng-general`, `#eng-alerts`, and `#random`.
- [ ] Accept GitHub Organization invite.
- [ ] Accept Jira / Confluence invite.
- [ ] Set up 1Password and join the Engineering Vault.

---

## Day 2: Local Environment Setup

- [ ] Install Homebrew, Node.js (v20 LTS), and Docker Desktop.
- [ ] Clone the main repository: `git clone git@github.com:infrawatch/infrawatch.git`
- [ ] Read the [Local Development Guide](../03-backend/06-local-development-guide.md).
- [ ] Copy `.env.example` to `.env` in both `/frontend` and `/backend`.
- [ ] Run `docker-compose up -d` to start local PostgreSQL and Redis.
- [ ] Run `npm install` and `npm run dev` in both directories.
- [ ] Verify you can log into the local frontend UI at `http://localhost:5173`.

---

## Day 3: The First PR

The goal of Week 1 is to merge a tiny PR into production to verify access and understand the deployment pipeline.

- [ ] Assign yourself a "Good First Issue" from the Jira board (e.g., fixing a typo in a component, updating a documentation file).
- [ ] Create a feature branch: `INFRA-XXX-my-first-pr`.
- [ ] Make the change, run local linters (`npm run lint`), and commit using Conventional Commits (`fix(ui): correct typo on login button`).
- [ ] Push branch and open a PR against `main`.
- [ ] Request a review from your Onboarding Buddy.
- [ ] Merge the PR and watch GitHub Actions deploy it to production!

---

## Related Documents

- **Local Setup:** [Local Development Guide](../03-backend/06-local-development-guide.md)
- **Workflow:** [Git Workflow](./01-git-workflow.md)
- **Index:** [IEKB Master Index](../00-foundation/00-IEKB-index.md)
