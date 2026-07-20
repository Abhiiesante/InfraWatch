# Technology Stack Decisions

> **IEKB Section:** 00 — Foundation & Overview  
> **Document:** 04-tech-stack-decisions.md  
> **Last Updated:** 2026-07-16  
> **Owner:** Tech Lead  
> **Status:** Approved

---

## Table of Contents

1. [Decision Framework](#decision-framework)
2. [Frontend Stack](#frontend-stack)
3. [Backend Stack](#backend-stack)
4. [Database Stack](#database-stack)
5. [Infrastructure Stack](#infrastructure-stack)
6. [Development Tooling](#development-tooling)
7. [Observability Stack](#observability-stack)
8. [Security Tooling](#security-tooling)
9. [AI/ML Stack (V1.1)](#aiml-stack-v11)
10. [Complete Dependency Manifest](#complete-dependency-manifest)
11. [Version Pinning Strategy](#version-pinning-strategy)
12. [Related Documents](#related-documents)

---

## Decision Framework

Every technology choice in InfraWatch is evaluated against these criteria:

| Criterion | Weight | Description |
|-----------|--------|-------------|
| **Type Safety** | 25% | Does it provide compile-time safety and IDE support? |
| **Team Velocity** | 20% | How quickly can the team be productive? |
| **Ecosystem Maturity** | 20% | Community size, documentation quality, security track record |
| **Operational Simplicity** | 15% | How easy is it to deploy, monitor, and troubleshoot? |
| **Scalability** | 10% | Can it grow with InfraWatch from 10 to 10,000 tenants? |
| **Cost** | 10% | Licensing, infrastructure, and hiring costs |

---

## Frontend Stack

### Core Framework: React 18 + TypeScript

**Decision:** Use React 18 with TypeScript as the frontend framework.

| Criterion | Score | Notes |
|-----------|-------|-------|
| Type Safety | ⭐⭐⭐⭐⭐ | Excellent TypeScript integration with typed components, hooks, and props |
| Team Velocity | ⭐⭐⭐⭐ | Large talent pool, extensive tutorials, mature patterns (hooks) |
| Ecosystem | ⭐⭐⭐⭐⭐ | Largest component ecosystem (npm), React DevTools, community support |
| Ops Simplicity | ⭐⭐⭐⭐ | SPA deployment to CDN, no server-side rendering complexity |
| Scalability | ⭐⭐⭐⭐⭐ | Code splitting, lazy loading, virtual DOM performance |
| Cost | ⭐⭐⭐⭐⭐ | Open source (MIT), no licensing costs |

**Alternatives Considered:**

| Alternative | Why Not |
|------------|---------|
| **Vue 3** | Smaller ecosystem, fewer enterprise patterns, smaller hiring pool |
| **Angular** | Heavier framework, steeper learning curve, more boilerplate |
| **Svelte/SvelteKit** | Excellent DX but smaller ecosystem, fewer enterprise-ready components |
| **Next.js** | SSR overhead not needed for SPA dashboard; adds complexity |

### Build Tool: Vite 5

```json
// vite.config.ts dependencies
{
  "vite": "^5.4.0",
  "vite-plugin-checker": "^0.7.0",
  "@vitejs/plugin-react-swc": "^3.7.0"
}
```

**Why Vite over Webpack:**
- 10-100x faster dev server startup (native ESM)
- Instant Hot Module Replacement (HMR)
- Built-in TypeScript, JSX, CSS modules support
- Rollup-based production builds (tree-shaking, code splitting)
- Simpler configuration (single `vite.config.ts`)

### State Management: Zustand + React Query (TanStack Query)

**Client State (Zustand):**
```typescript
// Example: UI state management with Zustand
import { create } from 'zustand';

interface SidebarStore {
  isCollapsed: boolean;
  toggle: () => void;
}

export const useSidebarStore = create<SidebarStore>((set) => ({
  isCollapsed: false,
  toggle: () => set((state) => ({ isCollapsed: !state.isCollapsed })),
}));
```

**Server State (React Query):**
```typescript
// Example: Server state with React Query
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useAssets(orgId: string) {
  return useQuery({
    queryKey: ['assets', orgId],
    queryFn: () => assetApi.getAll(orgId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useCreateAsset(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateAssetDto) => assetApi.create(orgId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets', orgId] });
    },
  });
}
```

**Why Two Libraries:**
- **Zustand** handles ephemeral UI state (sidebar, modals, filters) — ~1KB, no boilerplate
- **React Query** handles server-synchronized state (assets, incidents) — automatic caching, refetching, optimistic updates
- Together they eliminate the need for Redux (~40KB) and its boilerplate

### UI Component Library: Radix UI + Custom Design System

| Library | Purpose | Bundle Size |
|---------|---------|------------|
| **Radix UI** | Headless, accessible UI primitives (Dialog, Dropdown, Tabs) | ~20KB |
| **Recharts** | Dashboard charts (bar, line, pie, area) | ~45KB |
| **React Hook Form** | Form state management with validation | ~9KB |
| **date-fns** | Date formatting and manipulation | ~15KB (tree-shakeable) |
| **Leaflet + react-leaflet** | Map component for asset locations | ~40KB |

**Why not Material UI / Ant Design / Chakra:**
- Custom design system ensures brand consistency
- Headless components (Radix) allow full visual control
- Smaller bundle size than full component libraries (MUI ~300KB)
- No vendor lock-in on design decisions

### Additional Frontend Dependencies

```json
{
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-router-dom": "^6.24.0",
    "@tanstack/react-query": "^5.50.0",
    "zustand": "^4.5.0",
    "@radix-ui/react-dialog": "^1.1.0",
    "@radix-ui/react-dropdown-menu": "^2.1.0",
    "@radix-ui/react-tabs": "^1.1.0",
    "@radix-ui/react-toast": "^1.2.0",
    "@radix-ui/react-tooltip": "^1.1.0",
    "react-hook-form": "^7.52.0",
    "@hookform/resolvers": "^3.9.0",
    "zod": "^3.23.0",
    "recharts": "^2.12.0",
    "react-leaflet": "^4.2.0",
    "leaflet": "^1.9.0",
    "date-fns": "^3.6.0",
    "axios": "^1.7.0",
    "clsx": "^2.1.0",
    "lucide-react": "^0.400.0"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "vite": "^5.4.0",
    "@vitejs/plugin-react-swc": "^3.7.0",
    "vitest": "^2.0.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/jest-dom": "^6.4.0",
    "playwright": "^1.45.0",
    "eslint": "^9.7.0",
    "prettier": "^3.3.0"
  }
}
```

---

## Backend Stack

### Runtime: Node.js 20 LTS + TypeScript

**Decision:** Use Node.js 20 LTS with TypeScript compiled via SWC for the backend.

| Criterion | Score | Notes |
|-----------|-------|-------|
| Type Safety | ⭐⭐⭐⭐⭐ | TypeScript across full stack; shared types between frontend/backend |
| Team Velocity | ⭐⭐⭐⭐⭐ | Single language across entire codebase; no context switching |
| Ecosystem | ⭐⭐⭐⭐⭐ | npm is the world's largest package registry |
| Ops Simplicity | ⭐⭐⭐⭐ | Single runtime, Docker-friendly, well-understood deployment |
| Scalability | ⭐⭐⭐⭐ | Event loop handles I/O-bound workloads well; cluster mode for CPU |
| Cost | ⭐⭐⭐⭐⭐ | Open source, free |

**Why Node.js over Python/Java:**

| Factor | Node.js + TS | Python + FastAPI | Java + Spring Boot |
|--------|-------------|-----------------|-------------------|
| **Full-stack TypeScript** | ✅ Same language | ❌ Language switch | ❌ Language switch |
| **I/O Performance** | ✅ Excellent (event loop) | ⚠️ Good (async) | ✅ Excellent (threads) |
| **Startup Time** | ✅ ~500ms | ✅ ~1s | ❌ ~5-10s |
| **Memory Footprint** | ✅ ~80MB | ✅ ~60MB | ❌ ~300MB |
| **Hiring Pool** | ✅ Largest | ✅ Large | ⚠️ Enterprise-focused |
| **AI Readiness** | ⚠️ Limited ML libs | ✅ Best ML ecosystem | ⚠️ Limited ML libs |

> [!NOTE]
> The V1.1 AI Service will be built in **Python + FastAPI** to leverage the ML ecosystem (PyTorch, TensorFlow, OpenCV). This is a separate microservice, not part of the Node.js monolith.

### HTTP Framework: Express 4

```typescript
// Server setup example
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { authMiddleware } from './middleware/auth';
import { tenantMiddleware } from './middleware/tenant';
import { errorHandler } from './middleware/error';
import { requestLogger } from './middleware/logger';
import { rateLimiter } from './middleware/rateLimit';

const app = express();

// Global middleware
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(requestLogger);
app.use(rateLimiter);

// Route-level middleware
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/orgs', authMiddleware, tenantMiddleware, orgRoutes);

// Error handling
app.use(errorHandler);

export default app;
```

### ORM: Prisma 5

**Prisma Schema Example:**
```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Organization {
  id        Int      @id @default(autoincrement())
  name      String
  domain    String?  @unique
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  
  users      User[]
  assets     Asset[]
  cameras    Camera[]
  assetTypes AssetType[]
  
  @@map("organizations")
}

model User {
  id             Int          @id @default(autoincrement())
  tenantId       Int          @map("tenant_id")
  name           String
  email          String
  hashedPassword String       @map("hashed_password")
  role           UserRole     @default(INSPECTOR)
  createdAt      DateTime     @default(now()) @map("created_at")
  
  organization   Organization @relation(fields: [tenantId], references: [id])
  inspections    Inspection[]
  incidents      Incident[]
  
  @@unique([tenantId, email])
  @@index([tenantId])
  @@map("users")
}

enum UserRole {
  ADMIN
  MANAGER
  INSPECTOR
}
```

**Why Prisma:**
1. **Type-safe queries** — Generated TypeScript types for every model and query
2. **Declarative schema** — Single `.prisma` file is the source of truth for DB schema
3. **Migration management** — `prisma migrate dev` and `prisma migrate deploy`
4. **Prisma Studio** — Visual DB browser for development and debugging
5. **Raw SQL escape hatch** — `$queryRaw` for complex queries that need optimization

### Validation: Zod

```typescript
// Example: Asset creation validation
import { z } from 'zod';

export const createAssetSchema = z.object({
  name: z.string().min(1).max(255),
  assetTypeId: z.number().int().positive(),
  description: z.string().max(2000).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type CreateAssetDto = z.infer<typeof createAssetSchema>;
// TypeScript type is automatically inferred:
// { name: string; assetTypeId: number; description?: string; ... }
```

### Backend Dependencies

```json
{
  "dependencies": {
    "express": "^4.19.0",
    "@prisma/client": "^5.17.0",
    "zod": "^3.23.0",
    "jsonwebtoken": "^9.0.0",
    "bcryptjs": "^2.4.3",
    "bullmq": "^5.10.0",
    "ioredis": "^5.4.0",
    "@aws-sdk/client-s3": "^3.614.0",
    "@aws-sdk/s3-request-presigner": "^3.614.0",
    "@sendgrid/mail": "^8.1.0",
    "winston": "^3.13.0",
    "helmet": "^7.1.0",
    "cors": "^2.8.5",
    "express-rate-limit": "^7.3.0",
    "rate-limit-redis": "^4.2.0",
    "pdfkit": "^0.15.0",
    "csv-stringify": "^6.5.0",
    "uuid": "^10.0.0",
    "prom-client": "^15.1.0",
    "@opentelemetry/api": "^1.9.0",
    "@opentelemetry/sdk-node": "^0.52.0",
    "@opentelemetry/exporter-jaeger": "^1.25.0"
  },
  "devDependencies": {
    "prisma": "^5.17.0",
    "typescript": "^5.5.0",
    "@swc/core": "^1.7.0",
    "tsx": "^4.16.0",
    "vitest": "^2.0.0",
    "supertest": "^7.0.0",
    "@types/express": "^4.17.0",
    "@types/jsonwebtoken": "^9.0.0",
    "@types/bcryptjs": "^2.4.0",
    "@types/uuid": "^10.0.0",
    "eslint": "^9.7.0",
    "@typescript-eslint/eslint-plugin": "^7.16.0",
    "@typescript-eslint/parser": "^7.16.0",
    "prettier": "^3.3.0"
  }
}
```

---

## Database Stack

### Primary Database: PostgreSQL 16

**Why PostgreSQL 16:**

| Feature | InfraWatch Use |
|---------|---------------|
| **JSONB columns** | Flexible metadata on assets, camera config, settings |
| **Row-Level Security (RLS)** | Defense-in-depth for multi-tenant data isolation |
| **PostGIS extension** | Spatial queries for asset locations and map views |
| **Partial indexes** | Efficient queries for tenant-scoped, status-filtered data |
| **CTEs and window functions** | Complex reporting queries (trends, aggregations) |
| **LISTEN/NOTIFY** | Lightweight event notification (future real-time updates) |
| **Logical replication** | Read replicas for scaling read-heavy dashboard queries |
| **pg_stat_statements** | Query performance monitoring and optimization |

**Production Configuration:**
```ini
# postgresql.conf optimizations for InfraWatch
max_connections = 200
shared_buffers = 4GB
effective_cache_size = 12GB
work_mem = 64MB
maintenance_work_mem = 1GB
wal_buffers = 64MB
checkpoint_completion_target = 0.9
random_page_cost = 1.1
effective_io_concurrency = 200
min_wal_size = 1GB
max_wal_size = 4GB
log_min_duration_statement = 200   # Log queries > 200ms
log_statement = 'ddl'              # Log all DDL statements
```

### Cache & Queue: Redis 7

**Dual-purpose Redis usage:**

| Use Case | Redis Feature | Configuration |
|----------|--------------|---------------|
| **Rate limiting** | Key-value with TTL | `INCR` + `EXPIRE` per IP/user |
| **Job queue (BullMQ)** | Lists + sorted sets | Dedicated keyspace prefix `bull:` |
| **Session cache** | Key-value | JWT blacklist tokens, refresh token lookup |
| **API response cache** | Key-value with TTL | Dashboard aggregation cache (5 min TTL) |
| **Distributed locks** | Redlock | Report generation deduplication |

```typescript
// Redis connection configuration
import Redis from 'ioredis';

export const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => Math.min(times * 200, 5000),
  keyPrefix: 'infrawatch:',
});
```

### Object Storage: AWS S3

**Bucket Structure:**
```
infrawatch-{environment}/
├── inspections/
│   └── {tenant_id}/
│       └── {inspection_id}/
│           ├── original/          # Full-resolution uploads
│           └── thumbnails/        # Processed thumbnails
├── reports/
│   └── {tenant_id}/
│       └── {report_id}/
│           └── report.pdf
├── avatars/
│   └── {tenant_id}/
│       └── {user_id}.webp
└── exports/
    └── {tenant_id}/
        └── {export_id}.csv
```

---

## Infrastructure Stack

### Container: Docker

**Multi-stage Dockerfile (Backend):**
```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci --ignore-scripts
COPY . .
RUN npx prisma generate
RUN npm run build

# Stage 2: Production
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./
EXPOSE 3000
USER node
CMD ["node", "dist/server.js"]
```

### Orchestration: Kubernetes (EKS)

See [Kubernetes Manifests](../08-devops/02-kubernetes-manifests.md) for complete K8s configuration.

### IaC: Terraform

See [Terraform — AWS](../08-devops/03-terraform-aws.md) for complete infrastructure definitions.

### CI/CD: GitHub Actions

See [CI/CD Pipeline](../08-devops/06-ci-cd-pipeline.md) for complete pipeline configuration.

---

## Development Tooling

### Code Quality

| Tool | Purpose | Configuration |
|------|---------|---------------|
| **TypeScript** 5.5 | Type checking | `strict: true`, `noUncheckedIndexedAccess: true` |
| **ESLint** 9 | Linting | `@typescript-eslint`, custom rules |
| **Prettier** 3.3 | Code formatting | `printWidth: 100`, `singleQuote: true` |
| **Husky** | Git hooks | Pre-commit: lint + format; Pre-push: type-check |
| **lint-staged** | Staged file linting | Run ESLint/Prettier on staged files only |
| **commitlint** | Commit messages | Conventional Commits (`feat:`, `fix:`, `chore:`) |

### Testing

| Tool | Purpose | Layer |
|------|---------|-------|
| **Vitest** | Unit + integration tests | Backend + Frontend |
| **Supertest** | HTTP request testing | Backend API |
| **Testing Library** | Component testing | Frontend |
| **Playwright** | E2E browser testing | Full stack |
| **k6** | Load testing | Backend API |
| **OWASP ZAP** | Security scanning | Full stack |

### Editor Configuration

```json
// .vscode/settings.json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "typescript.preferences.importModuleSpecifier": "relative",
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

---

## Observability Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Metrics** | Prometheus + Grafana | Request latency, error rates, queue depth, resource usage |
| **Logging** | Winston + ELK Stack | Structured JSON logs, centralized search |
| **Tracing** | OpenTelemetry + Jaeger | Distributed request tracing across services |
| **Error Tracking** | Sentry (optional) | Frontend/backend error aggregation with stack traces |
| **Uptime** | AWS CloudWatch / Pingdom | External health monitoring and alerting |

See [Observability Overview](../09-observability/00-observability-overview.md) for detailed configuration.

---

## Security Tooling

| Tool | Purpose | Integration Point |
|------|---------|------------------|
| **Helmet** | HTTP security headers | Express middleware |
| **express-rate-limit** | API rate limiting | Express middleware |
| **bcryptjs** | Password hashing | AuthService |
| **jsonwebtoken** | JWT creation/verification | AuthService |
| **Zod** | Input validation / sanitization | All endpoints |
| **Snyk** | Dependency vulnerability scanning | CI/CD pipeline |
| **Trivy** | Docker image vulnerability scanning | CI/CD pipeline |
| **OWASP ZAP** | Dynamic application security testing | Pre-release |
| **AWS KMS** | Encryption key management | S3, RDS |

---

## AI/ML Stack (V1.1)

> [!NOTE]
> The AI stack is a **separate microservice** built in Python. It does not share dependencies with the Node.js backend.

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Runtime** | Python 3.12 + FastAPI | AI service HTTP API |
| **ML Framework** | PyTorch | Model training and inference |
| **Object Detection** | YOLOv8 (Ultralytics) | Smoke, fire, intrusion detection |
| **Image Processing** | OpenCV + Pillow | Frame extraction, preprocessing |
| **Model Serving** | TorchServe or Triton | Production model serving with batching |
| **Experiment Tracking** | MLflow | Model versioning, metrics, artifacts |
| **Data Pipeline** | Redis Streams | Event-driven image processing |
| **GPU Infrastructure** | AWS EC2 G5 / SageMaker | GPU-accelerated inference |

---

## Complete Dependency Manifest

### Production Dependencies (Backend)

| Package | Version | Purpose | License |
|---------|---------|---------|---------|
| express | ^4.19 | HTTP framework | MIT |
| @prisma/client | ^5.17 | Database ORM | Apache-2.0 |
| zod | ^3.23 | Validation | MIT |
| jsonwebtoken | ^9.0 | JWT auth | MIT |
| bcryptjs | ^2.4 | Password hashing | MIT |
| bullmq | ^5.10 | Job queue | MIT |
| ioredis | ^5.4 | Redis client | MIT |
| @aws-sdk/client-s3 | ^3.614 | S3 operations | Apache-2.0 |
| @sendgrid/mail | ^8.1 | Email delivery | MIT |
| winston | ^3.13 | Logging | MIT |
| prom-client | ^15.1 | Prometheus metrics | Apache-2.0 |
| helmet | ^7.1 | Security headers | MIT |
| cors | ^2.8 | CORS middleware | MIT |
| pdfkit | ^0.15 | PDF generation | MIT |
| csv-stringify | ^6.5 | CSV generation | MIT |

### Production Dependencies (Frontend)

| Package | Version | Purpose | License |
|---------|---------|---------|---------|
| react | ^18.3 | UI framework | MIT |
| react-dom | ^18.3 | DOM rendering | MIT |
| react-router-dom | ^6.24 | Client-side routing | MIT |
| @tanstack/react-query | ^5.50 | Server state management | MIT |
| zustand | ^4.5 | Client state management | MIT |
| @radix-ui/* | ^1.x | Accessible UI primitives | MIT |
| react-hook-form | ^7.52 | Form management | MIT |
| recharts | ^2.12 | Charts | MIT |
| axios | ^1.7 | HTTP client | MIT |
| lucide-react | ^0.400 | Icons | ISC |

---

## Version Pinning Strategy

### Rules

1. **Use caret ranges (`^`)** for application dependencies — allows minor/patch updates
2. **Use exact versions** in `package-lock.json` — deterministic installs across environments
3. **Pin major versions** for critical infrastructure (Node.js, PostgreSQL, Redis)
4. **Monthly dependency update cycle** — run `npm audit` and `npm outdated` monthly
5. **Security patches immediately** — apply within 24 hours of CVE disclosure

### Node.js Version Management

```json
// .nvmrc
20.15.0

// package.json
{
  "engines": {
    "node": ">=20.0.0 <21.0.0",
    "npm": ">=10.0.0"
  }
}
```

### Database Version Management

| Database | Version | Upgrade Window |
|----------|---------|---------------|
| PostgreSQL | 16.x | Annually (during maintenance window) |
| Redis | 7.x | Annually |

---

## Related Documents

- **Previous:** [Architecture Overview](./03-architecture-overview.md)
- **Next:** [Coding Standards](./05-coding-standards.md)
- **Backend Deep Dive:** [Project Setup](../03-backend/01-project-setup.md)
- **Frontend Deep Dive:** [Frontend Overview](../05-frontend/00-frontend-overview.md)
- **Index:** [IEKB Master Index](./00-IEKB-index.md)
