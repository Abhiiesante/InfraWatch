# Pagination & Filtering Patterns

> **IEKB Section:** 03 — Backend  
> **Document:** 13-pagination-filtering.md  
> **Last Updated:** 2026-07-16  
> **Owner:** Backend Lead  
> **Status:** Approved

---

## Table of Contents

1. [Standard Response Format](#standard-response-format)
2. [Query Parameter Parsing (Zod)](#query-parameter-parsing-zod)
3. [Prisma Pagination Implementation](#prisma-pagination-implementation)
4. [Search & Filtering Strategies](#search--filtering-strategies)
5. [Related Documents](#related-documents)

---

## Standard Response Format

All list endpoints (`GET /assets`, `GET /users`, etc.) must adhere to a standardized pagination wrapper. This ensures the frontend generic table components can parse the data without endpoint-specific logic.

```typescript
// src/types/pagination.ts
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

**API JSON Response:**
```json
{
  "items": [
    { "id": 1, "name": "Asset A" },
    { "id": 2, "name": "Asset B" }
  ],
  "total": 45,
  "page": 1,
  "limit": 20,
  "totalPages": 3
}
```

---

## Query Parameter Parsing (Zod)

Query parameters arrive as strings. They must be validated, coerced into numbers/booleans, and sanitized before passing to the Service layer.

We define a base schema that all list endpoints extend.

```typescript
// src/utils/pagination.ts
import { z } from 'zod';

export const basePaginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// src/modules/assets/asset.schema.ts
import { basePaginationSchema } from '@/utils/pagination';

export const getAssetsSchema = z.object({
  query: basePaginationSchema.extend({
    typeId: z.coerce.number().int().positive().optional(),
    status: z.enum(['ACTIVE', 'INACTIVE', 'MAINTENANCE', 'DECOMMISSIONED']).optional(),
  })
});

export type AssetListOptions = z.infer<typeof getAssetsSchema>['query'];
```

---

## Prisma Pagination Implementation

InfraWatch uses **Offset Pagination** (`skip` and `take`) rather than Cursor Pagination for V0. Offset pagination allows users to jump to specific pages (e.g., "Page 5 of 12"), which is a strong requirement for the dashboard tables.

```typescript
// Inside a service method
async list(tenantId: number, options: AssetListOptions): Promise<PaginatedResult<Asset>> {
  const { page, limit, search, sortBy = 'createdAt', sortOrder } = options;
  
  // Calculate offset
  const skip = (page - 1) * limit;

  // Build the dynamic WHERE clause
  const where: Prisma.AssetWhereInput = {
    deletedAt: null,
    // Add filtering logic here
  };

  // Build the order by clause dynamically
  const orderBy: Prisma.AssetOrderByWithRelationInput = {
    [sortBy]: sortOrder
  };

  // Run data fetch AND count query concurrently for performance
  const [items, total] = await Promise.all([
    prisma.asset.findMany({
      where,
      skip,
      take: limit,
      orderBy,
    }),
    prisma.asset.count({ where })
  ]);

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  };
}
```

---

## Search & Filtering Strategies

### 1. Basic Contains Search (ILIKE)

For simple text search across one or two columns.

```typescript
...(search && { 
  name: { contains: search, mode: 'insensitive' } 
})
```

### 2. Multi-Column OR Search

When a user types in a global search box, we might want to search across name, description, and serial number.

```typescript
...(search && {
  OR: [
    { name: { contains: search, mode: 'insensitive' } },
    { description: { contains: search, mode: 'insensitive' } }
  ]
})
```

### 3. Exact Match Filtering

For enums, statuses, or foreign keys.

```typescript
...(status && { status }),
...(typeId && { assetTypeId: typeId }),
```

### 4. JSONB Metadata Filtering

If the frontend passes advanced filters targeting the metadata JSONB object (e.g., `?meta_manufacturer=Ericsson`).

```typescript
// Advanced manual construction needed for JSONB
let metadataFilter = {};
if (options.metaManufacturer) {
  metadataFilter = { path: ['manufacturer'], equals: options.metaManufacturer };
}

// In Prisma where clause:
...(options.metaManufacturer && {
  metadata: metadataFilter
})
```
*Note: Advanced JSONB filtering in Prisma often requires precise typing or dropping to `$queryRaw` depending on the complexity of the query.*

---

## Related Documents

- **API Design:** [API Design Principles](../05-api/00-api-design-principles.md)
- **Services:** [Asset Service](./06-asset-service.md)
- **Database:** [Indexing & Performance](../01-database/10-indexing-performance.md)
- **Index:** [IEKB Master Index](../00-foundation/00-IEKB-index.md)
