# Overall Testing Strategy

> **IEKB Section:** 07 — Testing  
> **Document:** 00-testing-strategy.md  
> **Last Updated:** 2026-07-16  
> **Owner:** QA Lead  
> **Status:** Approved

---

## Table of Contents

1. [Testing Philosophy](#testing-philosophy)
2. [The Testing Pyramid](#the-testing-pyramid)
3. [Toolchain Overview](#toolchain-overview)
4. [Coverage Goals](#coverage-goals)
5. [Related Documents](#related-documents)

---

## Testing Philosophy

InfraWatch adopts a pragmatic approach to testing. We do not strive for 100% unit test coverage, as that often leads to brittle tests that break on minor refactors. Instead, we heavily emphasize **Integration Testing** on the backend and **End-to-End (E2E) Testing** on the frontend, ensuring that the critical paths our users rely on actually work.

---

## The Testing Pyramid

Our testing suite is structured around a modified testing pyramid:

1. **Unit Tests (Fast, Isolated):** Used strictly for complex business logic, utility functions, and complex React UI components (like the Kanban board logic). We avoid unit testing basic CRUD controllers.
2. **Integration Tests (Medium, Connected):** The core of our backend strategy. We test the API endpoints against a real PostgreSQL test database using Supertest, ensuring routes, middleware, validation, and database queries work together.
3. **End-to-End Tests (Slow, Comprehensive):** The core of our frontend strategy. We use Playwright to simulate a real user opening a browser, logging in, and interacting with the system.
4. **Load & Security Tests (Specialized):** Executed via CI/CD before major releases to ensure performance constraints are met and vulnerabilities are caught.

---

## Toolchain Overview

### Backend
- **Test Runner:** Jest
- **Assertion Library:** Jest built-in (`expect`)
- **API Testing:** Supertest
- **Mocking:** `jest-mock-extended` (for Prisma when Unit testing)
- **Data Factories:** Fishery (for generating database fixtures)

### Frontend
- **Unit/Component Tests:** Vitest + React Testing Library
- **E2E Tests:** Playwright

### Infrastructure
- **Load Testing:** k6
- **CI/CD Execution:** GitHub Actions

---

## Coverage Goals

We enforce coverage gates in our CI pipeline:
- **Backend Services:** 80% Branch Coverage
- **Backend Controllers:** 90% Integration Coverage (all endpoints must have at least one `200` and one `4xx` test).
- **Frontend Utilities:** 90% Statement Coverage
- **Frontend E2E:** All P0 and P1 user flows must have a passing Playwright script.

---

## Related Documents

- **Next:** [Backend Unit Testing](./01-unit-testing-backend.md)
- **Next:** [Backend Integration Testing](./02-integration-testing-backend.md)
- **Index:** [IEKB Master Index](../00-foundation/00-IEKB-index.md)
