# Backend API — Core Services Overview

> **IEKB Section:** 03 — Backend  
> **Document:** 00-backend-overview.md  
> **Last Updated:** 2026-07-16  
> **Owner:** Backend Lead  
> **Status:** Approved

---

## Table of Contents

1. [Architectural Pattern](#architectural-pattern)
2. [Directory Structure](#directory-structure)
3. [The Request Lifecycle](#the-request-lifecycle)
4. [Service Layer Principles](#service-layer-principles)
5. [Dependency Injection & Modularity](#dependency-injection--modularity)
6. [Related Documents](#related-documents)

---

## Architectural Pattern

The InfraWatch backend follows a **Modular Monolith** architecture built on Node.js and Express, heavily inspired by Domain-Driven Design (DDD) principles. 

Instead of organizing by technical concerns (e.g., all controllers in one folder, all models in another), code is primarily organized by **domain capability** (e.g., Auth, Assets, Inspections), falling back to technical layers within those domains.

We enforce a strict 3-tier architecture:
1. **Controllers (Presentation):** Handle HTTP request/response, extract params, and return formatted JSON.
2. **Services (Business Logic):** Core application logic, authorization checks, and workflow orchestration.
3. **Data Access (Persistence):** Prisma Client calls, abstracted away from the controllers.

---

## Directory Structure

```
backend/
├── src/
│   ├── app.ts                 # Express app initialization
│   ├── server.ts              # Entry point, starts HTTP server
│   ├── config/                # Global configurations (env, db, redis)
│   ├── middleware/            # Global middleware (auth, tenant, error)
│   ├── utils/                 # Global utilities (logger, errors, jwt)
│   ├── types/                 # Global TypeScript definitions
│   │
│   └── modules/               # Domain Modules
│       ├── auth/
│       │   ├── auth.controller.ts
│       │   ├── auth.service.ts
│       │   ├── auth.routes.ts
│       │   └── auth.schema.ts # Zod validation schemas
│       │
│       ├── organizations/
│       │   ├── org.controller.ts
│       │   ├── org.service.ts
│       │   └── org.routes.ts
│       │
│       ├── assets/            # Asset & AssetType management
│       ├── cameras/           # Camera & Stream management
│       ├── inspections/       # Inspections & Images
│       ├── incidents/         # Incident reporting & workflows
│       └── reports/           # PDF/CSV generation
```

---

## The Request Lifecycle

A typical HTTP request follows this path:

1. **Load Balancer (AWS ALB):** Terminates TLS.
2. **Express Router:** Matches HTTP method and path.
3. **Global Middleware:**
   - `helmet`: Adds security headers.
   - `cors`: Handles cross-origin rules.
   - `express.json`: Parses JSON bodies.
4. **Auth & Context Middleware:**
   - `authMiddleware`: Verifies JWT.
   - `tenantMiddleware`: Extracts `tenantId` and sets up `AsyncLocalStorage`.
   - `requireRole`: (Optional) Validates RBAC permissions.
5. **Validation Middleware:**
   - `validate(schema)`: Uses Zod to parse and sanitize `req.body` or `req.query`. Throws 400 on failure.
6. **Controller:**
   - Extracts validated data and `req.tenantContext`.
   - Calls the appropriate Service.
7. **Service:**
   - Executes business rules.
   - Calls `prisma` to read/write data.
8. **Controller (Return):**
   - Receives Service result.
   - Sends `200 OK` (or `201 Created`) with JSON payload.
9. **Error Handler (Fallback):**
   - If any step throws an error, it is caught by the global `errorHandler` middleware, formatted cleanly, and returned to the client.

---

## Service Layer Principles

The Service layer is the heart of the application. It must adhere to the following rules:

1. **No HTTP Knowledge:** Services must never import `Request`, `Response`, or know about HTTP status codes. They throw custom `AppError` instances, which the error middleware translates to HTTP statuses.
2. **First Argument is Tenant:** Unless the service is globally scoped (like Org provisioning), the first argument to almost every service method must be `tenantId: number`.
3. **Fat Services, Skinny Controllers:** Controllers should rarely exceed 20 lines of code. All complex logic belongs in the Service.
4. **Transaction Boundaries:** If a workflow requires multiple database writes (e.g., completing an inspection AND creating a follow-up incident), the Service must wrap them in a Prisma `$transaction`.

---

## Dependency Injection & Modularity

While V0 does not use a heavy DI framework (like NestJS or Inversify), we follow DI principles to make testing easier. 

Services export instances by default, but classes can be instantiated with mock dependencies for unit tests.

```typescript
// Good Pattern for V0
export class IncidentService {
  constructor(
    private notificationService = defaultNotificationService,
    private db = prisma
  ) {}
  
  async create(...) { ... }
}

// Default export for production use
export const incidentService = new IncidentService();
```

---

## Related Documents

- **Next:** [Project Setup & Configuration](./01-project-setup.md)
- **Middleware:** [Middleware Pipeline](./03-middleware-pipeline.md)
- **Errors:** [Error Handling Strategy](./02-error-handling.md)
- **Auth:** [Tenant Context](../02-auth/04-tenant-context.md)
- **Index:** [IEKB Master Index](../00-foundation/00-IEKB-index.md)
