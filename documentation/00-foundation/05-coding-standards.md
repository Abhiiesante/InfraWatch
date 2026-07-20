# Coding Standards

> **IEKB Section:** 00 — Foundation & Overview  
> **Document:** 05-coding-standards.md  
> **Last Updated:** 2026-07-16  
> **Owner:** Tech Lead  
> **Status:** Approved

---

## Table of Contents

1. [General Principles](#general-principles)
2. [TypeScript Standards](#typescript-standards)
3. [React / Frontend Standards](#react--frontend-standards)
4. [Express / Backend Standards](#express--backend-standards)
5. [SQL & Database Standards](#sql--database-standards)
6. [CSS Standards](#css-standards)
7. [Testing Standards](#testing-standards)
8. [Error Handling Standards](#error-handling-standards)
9. [Naming Conventions](#naming-conventions)
10. [File Organization Standards](#file-organization-standards)
11. [Documentation Standards](#documentation-standards)
12. [Git Commit Standards](#git-commit-standards)
13. [Code Review Checklist](#code-review-checklist)
14. [ESLint & Prettier Configuration](#eslint--prettier-configuration)
15. [Related Documents](#related-documents)

---

## General Principles

### The SOLID Principles (Applied to InfraWatch)

| Principle | Application |
|-----------|------------|
| **Single Responsibility** | Each service class handles one entity/domain. Each component renders one concern. |
| **Open/Closed** | Extend via new modules/components, don't modify existing ones for new features. |
| **Liskov Substitution** | Interfaces and abstract classes should be freely substitutable. |
| **Interface Segregation** | Keep interfaces small and focused (e.g., `Readable`, `Writable` not `CRUDable`). |
| **Dependency Inversion** | Services depend on interfaces (types), not implementations. Inject dependencies. |

### DRY, KISS, YAGNI

| Principle | Rule |
|-----------|------|
| **DRY (Don't Repeat Yourself)** | Extract shared logic into utilities after the second occurrence. Not the first — premature abstraction is worse than duplication. |
| **KISS (Keep It Simple)** | Prefer the simplest solution that solves the problem. If a 10-line function is clear, don't refactor it into 3 abstractions. |
| **YAGNI (You Ain't Gonna Need It)** | Don't build features or abstractions "just in case." Build for today's requirements, design for tomorrow's extensibility. |

---

## TypeScript Standards

### Compiler Configuration

```json
// tsconfig.json (shared base)
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src"
  }
}
```

### Type Safety Rules

```typescript
// ✅ DO: Use explicit types for function signatures
function calculateInspectionScore(
  completed: number,
  total: number,
): number {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
}

// ❌ DON'T: Use `any` — ever
function processData(data: any) { } // FORBIDDEN

// ✅ DO: Use `unknown` when type is truly unknown, then narrow
function processData(data: unknown): void {
  if (typeof data === 'string') {
    console.log(data.toUpperCase());
  }
}

// ✅ DO: Use branded types for IDs to prevent mixing
type TenantId = number & { readonly __brand: 'TenantId' };
type UserId = number & { readonly __brand: 'UserId' };
type AssetId = number & { readonly __brand: 'AssetId' };

// ✅ DO: Use discriminated unions for state
type IncidentStatus = 'OPEN' | 'ACKNOWLEDGED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

interface Incident {
  id: number;
  status: IncidentStatus;
  resolvedAt: IncidentStatus extends 'RESOLVED' | 'CLOSED' ? Date : null;
}

// ✅ DO: Use const assertions for fixed values
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_ERROR: 500,
} as const;

// ✅ DO: Prefer interfaces for object shapes, types for unions/intersections
interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
}

type UserRole = 'ADMIN' | 'MANAGER' | 'INSPECTOR';
type UserWithOrg = User & { organization: Organization };
```

### Null Handling

```typescript
// ✅ DO: Use null for intentional absence, undefined for missing
interface AssetFilter {
  status?: string;        // Optional filter — may not be provided
  tenantId: number;       // Required — always provided
  deletedAt: Date | null; // Nullable — explicitly "no deletion date"
}

// ✅ DO: Use optional chaining and nullish coalescing
const assetName = asset?.name ?? 'Unnamed Asset';

// ❌ DON'T: Use truthy checks for potentially falsy valid values
if (count) { } // Bug: fails for count === 0
if (count != null) { } // ✅ Correct: checks for null and undefined
```

### Async/Await Rules

```typescript
// ✅ DO: Always use async/await, never raw promises
async function getAssetById(tenantId: number, assetId: number): Promise<Asset | null> {
  return prisma.asset.findFirst({
    where: { id: assetId, tenantId },
  });
}

// ❌ DON'T: Use .then() chains
function getAssetById(tenantId: number, assetId: number) {
  return prisma.asset.findFirst({ where: { id: assetId, tenantId } })
    .then(asset => asset);
}

// ✅ DO: Use Promise.all for independent async operations
const [assets, incidents, inspections] = await Promise.all([
  assetService.getByTenant(tenantId),
  incidentService.getOpenByTenant(tenantId),
  inspectionService.getPendingByTenant(tenantId),
]);

// ✅ DO: Handle errors with try/catch, not .catch()
try {
  const asset = await assetService.create(tenantId, data);
  return res.status(201).json(asset);
} catch (error) {
  next(error); // Forward to error handling middleware
}
```

### Import Organization

```typescript
// Import order (enforced by ESLint):
// 1. Node.js built-in modules
import path from 'node:path';
import { readFile } from 'node:fs/promises';

// 2. Third-party packages
import express from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';

// 3. Internal modules — by layer
import { authMiddleware } from '@/middleware/auth';
import { AssetService } from '@/services/asset.service';
import { CreateAssetDto } from '@/schemas/asset.schema';
import { AppError } from '@/utils/errors';

// 4. Types (type-only imports)
import type { Request, Response, NextFunction } from 'express';
import type { TenantContext } from '@/types/context';
```

---

## React / Frontend Standards

### Component Structure

```tsx
// ✅ Standard component structure
// File: AssetCard.tsx

// 1. Imports
import { useState, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { Asset } from '@/types/asset';

// 2. Types/Interfaces
interface AssetCardProps {
  asset: Asset;
  onSelect: (assetId: number) => void;
  isSelected?: boolean;
}

// 3. Component (named export, not default)
export function AssetCard({ asset, onSelect, isSelected = false }: AssetCardProps) {
  // 3a. State
  const [isExpanded, setIsExpanded] = useState(false);
  
  // 3b. Derived values
  const statusColor = getStatusColor(asset.status);
  
  // 3c. Callbacks (memoized when passed to children)
  const handleClick = useCallback(() => {
    onSelect(asset.id);
  }, [asset.id, onSelect]);

  // 3d. Render
  return (
    <Card 
      className={`asset-card ${isSelected ? 'asset-card--selected' : ''}`}
      onClick={handleClick}
    >
      <Card.Header>
        <h3>{asset.name}</h3>
        <Badge color={statusColor}>{asset.type}</Badge>
      </Card.Header>
      {isExpanded && (
        <Card.Body>
          <p>{asset.description}</p>
        </Card.Body>
      )}
    </Card>
  );
}

// 4. Helper functions (below component)
function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    active: 'green',
    inactive: 'gray',
    maintenance: 'yellow',
    critical: 'red',
  };
  return colors[status] ?? 'gray';
}
```

### Hook Rules

```typescript
// ✅ DO: Extract complex logic into custom hooks
export function useAssets(orgId: string) {
  return useQuery({
    queryKey: ['assets', orgId],
    queryFn: () => assetApi.getAll(orgId),
    staleTime: 5 * 60 * 1000,
  });
}

// ✅ DO: Name hooks with `use` prefix
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

// ❌ DON'T: Use useEffect for data fetching — use React Query
useEffect(() => {
  fetch('/api/assets').then(r => r.json()).then(setAssets); // FORBIDDEN
}, []);
```

### Component File Naming

```
src/
├── components/
│   ├── ui/              # Reusable design system components
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Badge.tsx
│   │   └── index.ts     # Barrel export
│   ├── assets/           # Feature-specific components
│   │   ├── AssetCard.tsx
│   │   ├── AssetList.tsx
│   │   ├── AssetForm.tsx
│   │   └── AssetMap.tsx
│   └── layout/           # Layout components
│       ├── Sidebar.tsx
│       ├── Header.tsx
│       └── PageContainer.tsx
├── hooks/                # Custom hooks
│   ├── useAssets.ts
│   ├── useAuth.ts
│   └── useDebounce.ts
├── pages/                # Route-level components
│   ├── DashboardPage.tsx
│   ├── AssetListPage.tsx
│   └── AssetDetailPage.tsx
└── services/             # API client functions
    ├── api.ts            # Axios instance
    ├── asset.api.ts
    └── auth.api.ts
```

---

## Express / Backend Standards

### Route Handler Pattern

```typescript
// ✅ Standard route handler pattern
// File: src/routes/asset.routes.ts

import { Router } from 'express';
import { validate } from '@/middleware/validate';
import { requireRole } from '@/middleware/rbac';
import { createAssetSchema, updateAssetSchema } from '@/schemas/asset.schema';
import { AssetController } from '@/controllers/asset.controller';

const router = Router();
const controller = new AssetController();

router.get('/', controller.list);
router.get('/:assetId', controller.getById);
router.post('/', requireRole('ADMIN', 'MANAGER'), validate(createAssetSchema), controller.create);
router.put('/:assetId', requireRole('ADMIN', 'MANAGER'), validate(updateAssetSchema), controller.update);
router.delete('/:assetId', requireRole('ADMIN'), controller.delete);

export { router as assetRoutes };
```

### Controller Pattern

```typescript
// ✅ Controllers handle HTTP, delegate to services
export class AssetController {
  private assetService = new AssetService();

  list = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { tenantId } = req.tenantContext;
      const { page, limit, search, typeId } = req.query;

      const result = await this.assetService.list(tenantId, {
        page: Number(page) || 1,
        limit: Number(limit) || 20,
        search: search as string,
        typeId: typeId ? Number(typeId) : undefined,
      });

      return res.json(result);
    } catch (error) {
      next(error);
    }
  };

  create = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { tenantId, userId } = req.tenantContext;
      const asset = await this.assetService.create(tenantId, userId, req.body);
      return res.status(201).json(asset);
    } catch (error) {
      next(error);
    }
  };
}
```

### Service Layer Pattern

```typescript
// ✅ Services contain business logic, use Prisma for data access
export class AssetService {
  async list(tenantId: number, options: ListOptions): Promise<PaginatedResult<Asset>> {
    const { page, limit, search, typeId } = options;
    const skip = (page - 1) * limit;

    const where: Prisma.AssetWhereInput = {
      tenantId,
      ...(search && { name: { contains: search, mode: 'insensitive' } }),
      ...(typeId && { assetTypeId: typeId }),
    };

    const [items, total] = await Promise.all([
      prisma.asset.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      prisma.asset.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async create(tenantId: number, userId: number, data: CreateAssetDto): Promise<Asset> {
    // Validate asset type belongs to this tenant
    const assetType = await prisma.assetType.findFirst({
      where: { id: data.assetTypeId, tenantId },
    });

    if (!assetType) {
      throw new AppError('ASSET_TYPE_NOT_FOUND', 'Asset type not found', 404);
    }

    return prisma.asset.create({
      data: {
        ...data,
        tenantId,
        createdById: userId,
      },
    });
  }
}
```

---

## SQL & Database Standards

### Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Table names | `snake_case`, plural | `assets`, `inspection_images` |
| Column names | `snake_case` | `tenant_id`, `created_at`, `asset_type_id` |
| Primary keys | `id` (always) | `id SERIAL PRIMARY KEY` |
| Foreign keys | `{referenced_table_singular}_id` | `tenant_id`, `asset_id`, `inspector_id` |
| Indexes | `idx_{table}_{columns}` | `idx_assets_tenant_id`, `idx_assets_tenant_id_name` |
| Unique constraints | `uq_{table}_{columns}` | `uq_users_tenant_id_email` |
| Check constraints | `ck_{table}_{description}` | `ck_incidents_valid_status` |
| Enums | `PascalCase` values | `'ADMIN'`, `'INSPECTOR'`, `'OPEN'`, `'CLOSED'` |

### Migration Standards

```sql
-- ✅ DO: Include both up and down migrations
-- Migration: 002_add_asset_status.sql

-- Up
ALTER TABLE assets ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE assets ADD CONSTRAINT ck_assets_valid_status 
  CHECK (status IN ('ACTIVE', 'INACTIVE', 'MAINTENANCE', 'DECOMMISSIONED'));
CREATE INDEX idx_assets_tenant_id_status ON assets (tenant_id, status);

-- Down
DROP INDEX IF EXISTS idx_assets_tenant_id_status;
ALTER TABLE assets DROP CONSTRAINT IF EXISTS ck_assets_valid_status;
ALTER TABLE assets DROP COLUMN IF EXISTS status;
```

### Query Standards

```sql
-- ✅ DO: Always scope by tenant_id
SELECT a.id, a.name, at.name AS type_name
FROM assets a
JOIN asset_types at ON at.id = a.asset_type_id
WHERE a.tenant_id = $1  -- ALWAYS first condition
  AND a.status = 'ACTIVE'
ORDER BY a.created_at DESC
LIMIT $2 OFFSET $3;

-- ❌ DON'T: Query without tenant_id
SELECT * FROM assets WHERE name LIKE '%tower%';  -- FORBIDDEN: no tenant scope
```

---

## CSS Standards

### Methodology: BEM (Block-Element-Modifier)

```css
/* Block */
.asset-card { }

/* Element */
.asset-card__header { }
.asset-card__title { }
.asset-card__body { }

/* Modifier */
.asset-card--selected { }
.asset-card--critical { }
.asset-card__title--large { }
```

### CSS Custom Properties (Design Tokens)

```css
:root {
  /* Colors */
  --color-primary-50: #eef2ff;
  --color-primary-500: #6366f1;
  --color-primary-900: #312e81;
  
  /* Spacing */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-4: 1rem;
  --space-8: 2rem;
  
  /* Typography */
  --font-sans: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
  
  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
}
```

---

## Naming Conventions

### Universal Naming Rules

| Context | Convention | Example |
|---------|-----------|---------|
| **Files — Components** | PascalCase | `AssetCard.tsx`, `DashboardPage.tsx` |
| **Files — Utilities** | camelCase | `formatDate.ts`, `apiClient.ts` |
| **Files — Styles** | kebab-case | `asset-card.css`, `design-tokens.css` |
| **Files — Tests** | `*.test.ts(x)` | `asset.service.test.ts` |
| **Files — Schemas** | `*.schema.ts` | `asset.schema.ts` |
| **Files — Routes** | `*.routes.ts` | `asset.routes.ts` |
| **Directories** | kebab-case | `src/services/`, `src/middleware/` |
| **Variables** | camelCase | `tenantId`, `assetCount`, `isActive` |
| **Constants** | SCREAMING_SNAKE_CASE | `MAX_UPLOAD_SIZE`, `DEFAULT_PAGE_SIZE` |
| **Functions** | camelCase, verb prefix | `getAssetById`, `createInspection`, `isAuthorized` |
| **Classes** | PascalCase | `AssetService`, `AuthMiddleware` |
| **Interfaces** | PascalCase (no I prefix) | `User`, `CreateAssetDto`, `PaginatedResult` |
| **Types** | PascalCase | `UserRole`, `IncidentStatus` |
| **Enums** | PascalCase | `UserRole.ADMIN`, `IncidentStatus.OPEN` |
| **React Components** | PascalCase | `AssetCard`, `InspectionCalendar` |
| **React Hooks** | camelCase, `use` prefix | `useAssets`, `useAuth`, `useDebounce` |
| **CSS Classes** | BEM (kebab-case) | `asset-card__header--active` |
| **API Endpoints** | kebab-case, plural nouns | `/orgs/:orgId/assets`, `/orgs/:orgId/asset-types` |
| **Database Tables** | snake_case, plural | `assets`, `inspection_images` |
| **Database Columns** | snake_case | `tenant_id`, `created_at` |
| **Environment Variables** | SCREAMING_SNAKE_CASE | `DATABASE_URL`, `JWT_SECRET` |
| **Git Branches** | kebab-case with prefix | `feat/asset-crud`, `fix/auth-token-expiry` |

---

## Documentation Standards

### JSDoc for Public APIs

```typescript
/**
 * Creates a new asset within the tenant's organization.
 * 
 * @param tenantId - The organization's tenant ID (from JWT context)
 * @param userId - The ID of the user creating the asset
 * @param data - The asset creation data (validated by Zod schema)
 * @returns The created asset with generated ID and timestamps
 * @throws {AppError} ASSET_TYPE_NOT_FOUND (404) if asset type doesn't exist for this tenant
 * @throws {AppError} DUPLICATE_ASSET_NAME (409) if an asset with the same name exists
 * 
 * @example
 * ```typescript
 * const asset = await assetService.create(1, 5, {
 *   name: 'Tower T-142',
 *   assetTypeId: 1,
 *   latitude: 28.6139,
 *   longitude: 77.2090,
 * });
 * ```
 */
async create(tenantId: number, userId: number, data: CreateAssetDto): Promise<Asset> { }
```

---

## Git Commit Standards

### Conventional Commits

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

**Types:**

| Type | Use For |
|------|---------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Formatting, no code change |
| `refactor` | Restructuring without behavior change |
| `test` | Adding/modifying tests |
| `chore` | Build, CI, dependencies |
| `perf` | Performance improvement |

**Examples:**

```
feat(assets): add geo-coordinate support to asset creation
fix(auth): handle expired refresh token gracefully
docs(api): update OpenAPI spec with new incident status values
test(inspections): add integration tests for photo upload workflow
chore(deps): upgrade prisma to 5.17.0
```

---

## Code Review Checklist

### Reviewer Checklist

- [ ] **Correctness:** Does the code do what it claims?
- [ ] **Tenant Safety:** Are all queries scoped by `tenant_id`?
- [ ] **Auth/RBAC:** Are endpoints protected with appropriate role checks?
- [ ] **Input Validation:** Is all user input validated with Zod schemas?
- [ ] **Error Handling:** Are errors caught, classified, and returned properly?
- [ ] **Tests:** Are there unit tests for business logic and integration tests for APIs?
- [ ] **Types:** No `any` types, proper null handling?
- [ ] **Performance:** No N+1 queries, appropriate indexes?
- [ ] **Security:** No secrets in code, no SQL injection, no XSS vectors?
- [ ] **Documentation:** Public APIs documented with JSDoc?
- [ ] **Naming:** Follows naming conventions?
- [ ] **Commit Messages:** Conventional commits format?

---

## ESLint & Prettier Configuration

### ESLint Configuration

```javascript
// eslint.config.mjs
import tseslint from 'typescript-eslint';

export default tseslint.config(
  ...tseslint.configs.strictTypeChecked,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': ['warn', {
        allowExpressions: true,
        allowTypedFunctionExpressions: true,
      }],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'prefer-const': 'error',
      'no-var': 'error',
      'eqeqeq': ['error', 'always'],
    },
  },
);
```

### Prettier Configuration

```json
// .prettierrc
{
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "bracketSpacing": true,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

---

## Related Documents

- **Previous:** [Technology Stack Decisions](./04-tech-stack-decisions.md)
- **Next:** [Repository Structure](./06-repository-structure.md)
- **Backend:** [Backend Overview](../03-backend/00-backend-overview.md) — Applies these standards
- **Frontend:** [Frontend Overview](../05-frontend/00-frontend-overview.md) — Applies these standards
- **Index:** [IEKB Master Index](./00-IEKB-index.md)
