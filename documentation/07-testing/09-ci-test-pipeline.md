# CI Test Pipeline

> **IEKB Section:** 07 — Testing  
> **Document:** 09-ci-test-pipeline.md  
> **Last Updated:** 2026-07-16  
> **Owner:** DevOps / QA Lead  
> **Status:** Approved

---

## Table of Contents

1. [Overview](#overview)
2. [GitHub Actions Workflow](#github-actions-workflow)
3. [Test Database Provisioning in CI](#test-database-provisioning-in-ci)
4. [Handling Flaky Tests](#handling-flaky-tests)
5. [Related Documents](#related-documents)

---

## Overview

We use **GitHub Actions** as our CI/CD provider. 

Every Pull Request against the `main` branch must pass all unit, integration, and E2E tests before the "Merge" button is enabled. The pipeline is designed to fail fast—running linting, type-checking, and fast unit tests first, before spinning up databases for integration and E2E tests.

---

## GitHub Actions Workflow

This is an abbreviated version of the `.github/workflows/pr-checks.yml` file.

```yaml
name: PR Checks
on:
  pull_request:
    branches: [ main ]

jobs:
  static-analysis:
    name: Lint & Typecheck
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with: { node-version: '18', cache: 'npm' }
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck

  backend-tests:
    name: Backend Unit & Integration
    needs: static-analysis
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15-alpine
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: testpassword
          POSTGRES_DB: infrawatch_test
        ports:
          - 5432:5432
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with: { node-version: '18', cache: 'npm' }
      - run: npm ci
      # Push schema to test DB
      - run: npx prisma db push
        env:
          DATABASE_URL: postgresql://test:testpassword@localhost:5432/infrawatch_test
      # Run Jest
      - run: npm run test:backend
        env:
          DATABASE_URL: postgresql://test:testpassword@localhost:5432/infrawatch_test
          JWT_SECRET: test_secret_key

  frontend-tests:
    name: Frontend Unit
    needs: static-analysis
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:frontend # Runs Vitest

  e2e-tests:
    name: Playwright E2E
    needs: [backend-tests, frontend-tests]
    runs-on: ubuntu-latest
    # Requires DB and Redis for a full system boot
    services:
      postgres:
        image: postgres:15-alpine
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: testpassword
          POSTGRES_DB: infrawatch_e2e
        ports:
          - 5432:5432
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
        env:
          DATABASE_URL: postgresql://test:testpassword@localhost:5432/infrawatch_e2e
          REDIS_URL: redis://localhost:6379
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

---

## Test Database Provisioning in CI

Notice that for the `backend-tests` and `e2e-tests` jobs, we define a `services.postgres` block. This tells GitHub Actions to spin up a lightweight PostgreSQL Docker container alongside the runner.

We use `npx prisma db push` instead of `prisma migrate deploy` in CI because it is faster and doesn't require maintaining a migration history table for a throwaway test database.

---

## Handling Flaky Tests

Flaky tests (tests that fail randomly) destroy developer trust in the CI pipeline.

1. **Auto-Retries:** Playwright is configured to retry failed tests automatically (up to 2 times).
2. **Quarantine:** If a test is fundamentally flaky and cannot be fixed immediately, mark it with `test.skip` and open a JIRA ticket rather than letting it block the team.

---

## Related Documents

- **Strategy:** [Testing Strategy](./00-testing-strategy.md)
- **E2E:** [E2E Testing Guide](./03-e2e-testing-guide.md)
- **Index:** [IEKB Master Index](../00-foundation/00-IEKB-index.md)
