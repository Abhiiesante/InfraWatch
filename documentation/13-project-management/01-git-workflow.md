# Git Workflow (Trunk-Based Development)

> **IEKB Section:** 14 — Project Management  
> **Document:** 01-git-workflow.md  
> **Last Updated:** 2026-07-16  
> **Owner:** Tech Lead  
> **Status:** Approved

---

## Table of Contents

1. [Overview](#overview)
2. [Branching Strategy](#branching-strategy)
3. [Commit Message Convention](#commit-message-convention)
4. [Related Documents](#related-documents)

---

## Overview

We use **Trunk-Based Development**. There is only one long-lived branch: `main`. 

We do not use GitFlow (no `develop`, `release`, or `hotfix` branches). The `main` branch is always in a deployable state. Features are integrated into `main` continuously via short-lived feature branches, often utilizing Feature Toggles to hide incomplete work.

---

## Branching Strategy

1. **Create a branch off `main`:**
   - Branches should be named using the Jira ticket ID and a brief description.
   - Example: `INFRA-123-add-asset-type-dropdown`
   
2. **Develop and Commit locally:**
   - Keep branches short-lived (aim to merge within 1-3 days).
   - If a feature takes longer, break it into smaller PRs.

3. **Open a Pull Request against `main`:**
   - CI will automatically run tests and linters.
   - Requires at least 1 code review approval.

4. **Squash and Merge:**
   - When merging, we strictly use "Squash and Merge" so the `main` history remains linear and clean (one commit per feature/bugfix).

---

## Commit Message Convention

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification. This allows us to auto-generate changelogs and strictly enforces semantic versioning.

**Format:**
```
<type>(<optional scope>): <description>

[optional body]

[optional footer]
```

**Types:**
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code (formatting)
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `test`: Adding missing tests or correcting existing tests
- `chore`: Changes to the build process or auxiliary tools

**Examples:**
- `feat(api): add pagination to getAssets`
- `fix(frontend): resolve memory leak in Kanban board`
- `docs(iekb): update Git workflow`

---

## Related Documents

- **Pull Requests:** [PR Guidelines](./02-pr-guidelines.md)
- **Deployment:** [Release Management](./04-release-management.md)
- **Index:** [IEKB Master Index](../00-foundation/00-IEKB-index.md)
