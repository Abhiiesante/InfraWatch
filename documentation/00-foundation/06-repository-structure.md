# Repository Structure

> **IEKB Section:** 00 — Foundation & Overview  
> **Document:** 06-repository-structure.md  
> **Last Updated:** 2026-07-16  
> **Owner:** Tech Lead  
> **Status:** Approved

---

## Table of Contents

1. [Repository Strategy](#repository-strategy)
2. [Top-Level Structure](#top-level-structure)
3. [Backend Directory Structure](#backend-directory-structure)
4. [Frontend Directory Structure](#frontend-directory-structure)
5. [Shared Packages](#shared-packages)
6. [Infrastructure Directory](#infrastructure-directory)
7. [Root Configuration Files](#root-configuration-files)
8. [File Placement Rules](#file-placement-rules)
9. [Related Documents](#related-documents)

---

## Repository Strategy

InfraWatch uses a **monorepo** managed with npm workspaces. This approach keeps all application code, infrastructure definitions, and shared packages in a single repository.

### Why Monorepo

| Benefit | Description |
|---------|------------|
| **Atomic changes** | Frontend and backend changes in a single PR |
| **Shared types** | TypeScript types shared between frontend and backend via `@infrawatch/shared` |
| **Unified CI/CD** | One pipeline configuration for all components |
| **Simplified dependencies** | Shared `node_modules` via workspaces |
| **Code discoverability** | Everything searchable in one place |

### Workspace Configuration

```json
// package.json (root)
{
  "name": "infrawatch",
  "private": true,
  "workspaces": [
    "packages/*",
    "apps/*"
  ],
  "scripts": {
    "dev": "npm run dev --workspace=apps/api & npm run dev --workspace=apps/web",
    "build": "npm run build --workspaces",
    "test": "npm run test --workspaces",
    "lint": "npm run lint --workspaces",
    "format": "prettier --write \"**/*.{ts,tsx,js,json,css,md}\"",
    "db:migrate": "npm run db:migrate --workspace=apps/api",
    "db:seed": "npm run db:seed --workspace=apps/api",
    "db:studio": "npm run db:studio --workspace=apps/api"
  }
}
```

---

## Top-Level Structure

```
infrawatch/
├── .github/                        # GitHub configuration
│   ├── workflows/                  # CI/CD pipeline definitions
│   │   ├── ci.yml                  # Main CI pipeline (lint, test, build)
│   │   ├── deploy-staging.yml      # Staging deployment
│   │   ├── deploy-production.yml   # Production deployment
│   │   └── security-scan.yml       # Security scanning
│   ├── PULL_REQUEST_TEMPLATE.md    # PR template
│   ├── ISSUE_TEMPLATE/             # Issue templates
│   │   ├── bug-report.md
│   │   ├── feature-request.md
│   │   └── security-vulnerability.md
│   └── CODEOWNERS                  # Code ownership rules
│
├── apps/                           # Application code
│   ├── api/                        # Backend API application
│   │   ├── src/                    # Source code
│   │   ├── prisma/                 # Database schema & migrations
│   │   ├── tests/                  # Test files
│   │   ├── package.json            # Backend dependencies
│   │   ├── tsconfig.json           # Backend TypeScript config
│   │   └── Dockerfile              # Backend container
│   │
│   ├── web/                        # Frontend web application
│   │   ├── src/                    # Source code
│   │   ├── public/                 # Static assets
│   │   ├── package.json            # Frontend dependencies
│   │   ├── tsconfig.json           # Frontend TypeScript config
│   │   ├── vite.config.ts          # Vite configuration
│   │   └── Dockerfile              # Frontend container
│   │
│   └── worker/                     # Background worker application
│       ├── src/                    # Source code
│       ├── package.json            # Worker dependencies
│       ├── tsconfig.json           # Worker TypeScript config
│       └── Dockerfile              # Worker container
│
├── packages/                       # Shared packages
│   └── shared/                     # Shared types, constants, utilities
│       ├── src/
│       │   ├── types/              # Shared TypeScript types
│       │   ├── constants/          # Shared constants
│       │   ├── schemas/            # Shared Zod schemas
│       │   └── utils/              # Shared utility functions
│       ├── package.json
│       └── tsconfig.json
│
├── infra/                          # Infrastructure as Code
│   ├── terraform/                  # Terraform configurations
│   │   ├── modules/                # Reusable Terraform modules
│   │   ├── environments/           # Environment-specific configs
│   │   │   ├── dev/
│   │   │   ├── staging/
│   │   │   └── production/
│   │   └── variables.tf
│   ├── kubernetes/                 # Kubernetes manifests
│   │   ├── base/                   # Base manifests
│   │   └── overlays/              # Environment overlays (Kustomize)
│   │       ├── dev/
│   │       ├── staging/
│   │       └── production/
│   └── docker/                     # Docker Compose for local dev
│       └── docker-compose.yml
│
├── docs/                           # Documentation
│   ├── IEKB/                       # Engineering Knowledge Base
│   ├── api/                        # Generated API docs
│   └── architecture/               # Architecture diagrams
│
├── scripts/                        # Utility scripts
│   ├── setup.sh                    # First-time setup script
│   ├── seed-dev.sh                 # Seed development database
│   └── generate-openapi.sh         # Generate OpenAPI spec
│
├── .env.example                    # Environment variable template
├── .gitignore                      # Git ignore rules
├── .nvmrc                          # Node.js version
├── .prettierrc                     # Prettier config
├── .prettierignore                 # Prettier ignore
├── eslint.config.mjs               # ESLint config
├── package.json                    # Root package.json (workspaces)
├── package-lock.json               # Dependency lockfile
├── README.md                       # Project README
└── turbo.json                      # Turborepo config (optional)
```

---

## Backend Directory Structure

```
apps/api/
├── src/
│   ├── server.ts                   # Application entry point
│   ├── app.ts                      # Express app configuration
│   │
│   ├── config/                     # Configuration
│   │   ├── index.ts                # Centralized config (from env vars)
│   │   ├── database.ts             # Database configuration
│   │   ├── redis.ts                # Redis configuration
│   │   ├── s3.ts                   # S3 configuration
│   │   └── email.ts                # Email service configuration
│   │
│   ├── middleware/                  # Express middleware
│   │   ├── auth.ts                 # JWT authentication
│   │   ├── tenant.ts               # Tenant context extraction
│   │   ├── rbac.ts                 # Role-based access control
│   │   ├── validate.ts             # Request validation (Zod)
│   │   ├── rateLimit.ts            # Rate limiting
│   │   ├── errorHandler.ts         # Global error handler
│   │   ├── requestLogger.ts        # Request/response logging
│   │   └── cors.ts                 # CORS configuration
│   │
│   ├── routes/                     # Route definitions
│   │   ├── index.ts                # Route aggregator
│   │   ├── auth.routes.ts          # /auth/*
│   │   ├── org.routes.ts           # /orgs/*
│   │   ├── user.routes.ts          # /orgs/:orgId/users/*
│   │   ├── asset.routes.ts         # /orgs/:orgId/assets/*
│   │   ├── assetType.routes.ts     # /orgs/:orgId/asset-types/*
│   │   ├── camera.routes.ts        # /orgs/:orgId/cameras/*
│   │   ├── inspection.routes.ts    # /orgs/:orgId/inspections/*
│   │   ├── incident.routes.ts      # /orgs/:orgId/incidents/*
│   │   ├── report.routes.ts        # /orgs/:orgId/reports/*
│   │   ├── dashboard.routes.ts     # /orgs/:orgId/dashboard/*
│   │   └── health.routes.ts        # /health, /ready
│   │
│   ├── controllers/                # Request handlers (thin layer)
│   │   ├── auth.controller.ts
│   │   ├── org.controller.ts
│   │   ├── user.controller.ts
│   │   ├── asset.controller.ts
│   │   ├── camera.controller.ts
│   │   ├── inspection.controller.ts
│   │   ├── incident.controller.ts
│   │   ├── report.controller.ts
│   │   └── dashboard.controller.ts
│   │
│   ├── services/                   # Business logic layer
│   │   ├── auth.service.ts
│   │   ├── org.service.ts
│   │   ├── user.service.ts
│   │   ├── asset.service.ts
│   │   ├── camera.service.ts
│   │   ├── inspection.service.ts
│   │   ├── incident.service.ts
│   │   ├── report.service.ts
│   │   ├── notification.service.ts
│   │   ├── fileUpload.service.ts
│   │   └── dashboard.service.ts
│   │
│   ├── schemas/                    # Zod validation schemas
│   │   ├── auth.schema.ts
│   │   ├── org.schema.ts
│   │   ├── user.schema.ts
│   │   ├── asset.schema.ts
│   │   ├── camera.schema.ts
│   │   ├── inspection.schema.ts
│   │   ├── incident.schema.ts
│   │   ├── report.schema.ts
│   │   └── common.schema.ts        # Pagination, filters
│   │
│   ├── types/                      # TypeScript type definitions
│   │   ├── context.ts              # TenantContext, AuthenticatedRequest
│   │   ├── pagination.ts           # PaginatedResult, ListOptions
│   │   └── express.d.ts            # Express type augmentation
│   │
│   ├── utils/                      # Utility functions
│   │   ├── errors.ts               # AppError class, error codes
│   │   ├── jwt.ts                  # JWT sign/verify helpers
│   │   ├── password.ts             # bcrypt hash/compare helpers
│   │   ├── pagination.ts           # Pagination calculator
│   │   ├── logger.ts               # Winston logger instance
│   │   └── metrics.ts              # Prometheus metrics
│   │
│   └── jobs/                       # BullMQ job definitions
│       ├── queue.ts                # Queue initialization
│       ├── reportGeneration.job.ts
│       ├── imageProcessing.job.ts
│       ├── emailNotification.job.ts
│       └── slackNotification.job.ts
│
├── prisma/
│   ├── schema.prisma               # Database schema
│   ├── migrations/                  # SQL migrations (auto-generated)
│   │   ├── 20260716_init/
│   │   │   └── migration.sql
│   │   └── migration_lock.toml
│   └── seed.ts                     # Database seeder
│
├── tests/
│   ├── unit/                       # Unit tests
│   │   ├── services/
│   │   │   ├── asset.service.test.ts
│   │   │   ├── auth.service.test.ts
│   │   │   └── incident.service.test.ts
│   │   └── utils/
│   │       ├── jwt.test.ts
│   │       └── password.test.ts
│   │
│   ├── integration/                # API integration tests
│   │   ├── auth.test.ts
│   │   ├── assets.test.ts
│   │   ├── cameras.test.ts
│   │   ├── inspections.test.ts
│   │   ├── incidents.test.ts
│   │   └── reports.test.ts
│   │
│   ├── helpers/                    # Test utilities
│   │   ├── setup.ts                # Global test setup
│   │   ├── factories.ts            # Test data factories
│   │   ├── database.ts             # Test DB helpers
│   │   └── auth.ts                 # Auth helpers (generate test tokens)
│   │
│   └── vitest.config.ts            # Test configuration
│
├── package.json
├── tsconfig.json
├── tsconfig.build.json
├── Dockerfile
└── .env.example
```

---

## Frontend Directory Structure

```
apps/web/
├── src/
│   ├── main.tsx                    # Application entry point
│   ├── App.tsx                     # Root component with providers
│   ├── router.tsx                  # React Router configuration
│   │
│   ├── assets/                     # Static assets
│   │   ├── images/
│   │   ├── icons/
│   │   └── fonts/
│   │
│   ├── components/                 # React components
│   │   ├── ui/                     # Design system primitives
│   │   │   ├── Button/
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Button.css
│   │   │   │   └── index.ts
│   │   │   ├── Card/
│   │   │   ├── Badge/
│   │   │   ├── Dialog/
│   │   │   ├── Input/
│   │   │   ├── Select/
│   │   │   ├── Table/
│   │   │   ├── Toast/
│   │   │   ├── Tooltip/
│   │   │   └── index.ts            # Barrel export
│   │   │
│   │   ├── layout/                 # Layout components
│   │   │   ├── AppLayout.tsx       # Main app layout (sidebar + content)
│   │   │   ├── AuthLayout.tsx      # Login/register layout
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   ├── PageContainer.tsx
│   │   │   └── Breadcrumbs.tsx
│   │   │
│   │   ├── auth/                   # Auth-related components
│   │   │   ├── LoginForm.tsx
│   │   │   ├── RegisterForm.tsx
│   │   │   └── ProtectedRoute.tsx
│   │   │
│   │   ├── dashboard/              # Dashboard components
│   │   │   ├── StatCard.tsx
│   │   │   ├── IncidentChart.tsx
│   │   │   ├── InspectionChart.tsx
│   │   │   └── RecentActivity.tsx
│   │   │
│   │   ├── assets/                 # Asset components
│   │   │   ├── AssetList.tsx
│   │   │   ├── AssetCard.tsx
│   │   │   ├── AssetForm.tsx
│   │   │   ├── AssetDetail.tsx
│   │   │   └── AssetMap.tsx
│   │   │
│   │   ├── cameras/                # Camera components
│   │   │   ├── CameraList.tsx
│   │   │   ├── CameraForm.tsx
│   │   │   └── CameraDetail.tsx
│   │   │
│   │   ├── inspections/            # Inspection components
│   │   │   ├── InspectionList.tsx
│   │   │   ├── InspectionForm.tsx
│   │   │   ├── InspectionDetail.tsx
│   │   │   ├── InspectionCalendar.tsx
│   │   │   └── PhotoUpload.tsx
│   │   │
│   │   ├── incidents/              # Incident components
│   │   │   ├── IncidentList.tsx
│   │   │   ├── IncidentForm.tsx
│   │   │   ├── IncidentDetail.tsx
│   │   │   └── IncidentTimeline.tsx
│   │   │
│   │   ├── reports/                # Report components
│   │   │   ├── ReportGenerator.tsx
│   │   │   └── ReportList.tsx
│   │   │
│   │   └── settings/               # Settings components
│   │       ├── OrgSettings.tsx
│   │       ├── UserManagement.tsx
│   │       └── NotificationPrefs.tsx
│   │
│   ├── pages/                      # Route-level page components
│   │   ├── LoginPage.tsx
│   │   ├── RegisterPage.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── AssetListPage.tsx
│   │   ├── AssetDetailPage.tsx
│   │   ├── CameraListPage.tsx
│   │   ├── InspectionListPage.tsx
│   │   ├── InspectionDetailPage.tsx
│   │   ├── IncidentListPage.tsx
│   │   ├── IncidentDetailPage.tsx
│   │   ├── ReportsPage.tsx
│   │   ├── SettingsPage.tsx
│   │   └── NotFoundPage.tsx
│   │
│   ├── hooks/                      # Custom React hooks
│   │   ├── useAuth.ts
│   │   ├── useAssets.ts
│   │   ├── useCameras.ts
│   │   ├── useInspections.ts
│   │   ├── useIncidents.ts
│   │   ├── useDashboard.ts
│   │   ├── useDebounce.ts
│   │   ├── useMediaQuery.ts
│   │   └── useToast.ts
│   │
│   ├── services/                   # API client layer
│   │   ├── api.ts                  # Axios instance + interceptors
│   │   ├── auth.api.ts
│   │   ├── org.api.ts
│   │   ├── user.api.ts
│   │   ├── asset.api.ts
│   │   ├── camera.api.ts
│   │   ├── inspection.api.ts
│   │   ├── incident.api.ts
│   │   ├── report.api.ts
│   │   └── dashboard.api.ts
│   │
│   ├── stores/                     # Zustand state stores
│   │   ├── authStore.ts
│   │   ├── sidebarStore.ts
│   │   └── notificationStore.ts
│   │
│   ├── styles/                     # Global styles
│   │   ├── index.css               # Global CSS + reset
│   │   ├── design-tokens.css       # CSS custom properties
│   │   ├── typography.css          # Font imports + type scale
│   │   └── animations.css          # Shared keyframe animations
│   │
│   ├── types/                      # Frontend-specific types
│   │   ├── api.ts                  # API response types
│   │   └── routes.ts               # Route parameter types
│   │
│   └── utils/                      # Utility functions
│       ├── formatDate.ts
│       ├── formatNumber.ts
│       ├── cn.ts                   # className merger (clsx)
│       └── storage.ts              # localStorage helpers
│
├── public/
│   ├── favicon.ico
│   ├── manifest.json               # PWA manifest
│   └── robots.txt
│
├── tests/
│   ├── components/                 # Component tests
│   ├── pages/                      # Page-level tests
│   └── e2e/                        # Playwright E2E tests
│       ├── auth.spec.ts
│       ├── assets.spec.ts
│       └── playwright.config.ts
│
├── package.json
├── tsconfig.json
├── vite.config.ts
├── index.html
└── Dockerfile
```

---

## Shared Packages

```
packages/shared/
├── src/
│   ├── types/
│   │   ├── user.ts                 # User, UserRole types
│   │   ├── organization.ts         # Organization type
│   │   ├── asset.ts                # Asset, AssetType types
│   │   ├── camera.ts               # Camera type
│   │   ├── inspection.ts           # Inspection, InspectionImage types
│   │   ├── incident.ts             # Incident, IncidentStatus types
│   │   ├── report.ts               # Report type
│   │   ├── pagination.ts           # PaginatedResult, ListOptions
│   │   ├── api.ts                  # ApiResponse, ApiError
│   │   └── index.ts                # Barrel export
│   │
│   ├── constants/
│   │   ├── roles.ts                # UserRole enum/const
│   │   ├── incidentStatus.ts       # IncidentStatus enum/const
│   │   ├── pagination.ts           # DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE
│   │   └── index.ts
│   │
│   ├── schemas/
│   │   ├── auth.schema.ts          # Login, register validation
│   │   ├── asset.schema.ts         # Asset CRUD validation
│   │   ├── common.schema.ts        # Pagination, ID params
│   │   └── index.ts
│   │
│   └── utils/
│       ├── validation.ts           # Shared validation helpers
│       └── index.ts
│
├── package.json
├── tsconfig.json
└── tsconfig.build.json
```

---

## Infrastructure Directory

```
infra/
├── terraform/
│   ├── modules/
│   │   ├── networking/             # VPC, subnets, security groups
│   │   │   ├── main.tf
│   │   │   ├── variables.tf
│   │   │   └── outputs.tf
│   │   ├── database/               # RDS PostgreSQL
│   │   ├── cache/                  # ElastiCache Redis
│   │   ├── storage/                # S3 buckets
│   │   ├── compute/                # EKS or ECS
│   │   ├── cdn/                    # CloudFront
│   │   ├── monitoring/             # CloudWatch, Prometheus
│   │   └── iam/                    # IAM roles and policies
│   │
│   └── environments/
│       ├── dev/
│       │   ├── main.tf
│       │   ├── variables.tf
│       │   └── terraform.tfvars
│       ├── staging/
│       └── production/
│
├── kubernetes/
│   ├── base/
│   │   ├── api-deployment.yaml
│   │   ├── api-service.yaml
│   │   ├── worker-deployment.yaml
│   │   ├── ingress.yaml
│   │   ├── configmap.yaml
│   │   └── kustomization.yaml
│   └── overlays/
│       ├── dev/
│       ├── staging/
│       └── production/
│
└── docker/
    ├── docker-compose.yml          # Full local dev environment
    ├── docker-compose.test.yml     # Test environment
    └── .env.docker                 # Docker-specific env vars
```

---

## File Placement Rules

| Question | Answer | Location |
|----------|--------|----------|
| Is it a React component? | Yes | `apps/web/src/components/{feature}/` |
| Is it a page-level component? | Yes | `apps/web/src/pages/` |
| Is it a custom hook? | Yes | `apps/web/src/hooks/` |
| Is it an API client function? | Yes | `apps/web/src/services/` |
| Is it a backend route? | Yes | `apps/api/src/routes/` |
| Is it business logic? | Yes | `apps/api/src/services/` |
| Is it a validation schema shared between FE/BE? | Yes | `packages/shared/src/schemas/` |
| Is it a type shared between FE/BE? | Yes | `packages/shared/src/types/` |
| Is it a type used only in backend? | Yes | `apps/api/src/types/` |
| Is it a Terraform module? | Yes | `infra/terraform/modules/` |
| Is it a K8s manifest? | Yes | `infra/kubernetes/` |
| Is it a CI/CD workflow? | Yes | `.github/workflows/` |
| Is it a database migration? | Yes | `apps/api/prisma/migrations/` |
| Is it documentation? | Yes | `docs/` or `docs/IEKB/` |

---

## Related Documents

- **Previous:** [Coding Standards](./05-coding-standards.md)
- **Next:** [Development Workflow](./07-development-workflow.md)
- **Backend:** [Backend Project Setup](../03-backend/01-project-setup.md)
- **Frontend:** [Frontend Project Setup](../05-frontend/01-project-setup.md)
- **DevOps:** [Docker Setup](../08-devops/01-docker-setup.md)
- **Index:** [IEKB Master Index](./00-IEKB-index.md)
