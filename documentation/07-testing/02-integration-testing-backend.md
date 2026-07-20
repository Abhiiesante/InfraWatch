# Backend Integration Testing

> **IEKB Section:** 07 — Testing  
> **Document:** 02-integration-testing-backend.md  
> **Last Updated:** 2026-07-16  
> **Owner:** QA Lead  
> **Status:** Approved

---

## Table of Contents

1. [Scope of Integration Tests](#scope-of-integration-tests)
2. [Test Database Management](#test-database-management)
3. [Supertest Setup](#supertest-setup)
4. [Example: Endpoint Test](#example-endpoint-test)
5. [Related Documents](#related-documents)

---

## Scope of Integration Tests

Integration Tests verify the complete HTTP request lifecycle: Routing ➔ Middleware (Auth/Tenant/Validation) ➔ Controller ➔ Service ➔ Database, and back to the HTTP Response. 

They do **not** use mocked databases. They run against a real, isolated PostgreSQL test database to ensure Prisma schemas, constraints, and cascade deletes function as expected.

External network calls (AWS S3, BullMQ, SES) must still be mocked so tests run offline and quickly.

---

## Test Database Management

Running integration tests concurrently against the same database causes race conditions. Jest runs test files concurrently by default. 

**Solution:** Each test file gets its own logical PostgreSQL schema, or we run Jest sequentially (`--runInBand`) and truncate tables between tests. For V0, we use sequential execution with truncation for simplicity.

```typescript
// test/setup-integration.ts
import { prisma } from '@/config/prisma';

// Run before all tests in a file
beforeAll(async () => {
  // Ensure we are connected to the test DB, NOT production
  if (!process.env.DATABASE_URL?.includes('test')) {
    throw new Error('Integration tests must be run against a test database!');
  }
});

// Run after EACH test to wipe data
afterEach(async () => {
  // Deletes all records but keeps the table structure
  // The order matters if there are foreign keys, or we can use raw SQL TRUNCATE CASCADE
  const tableNames = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables WHERE schemaname='public'
  `;
  
  for (const { tablename } of tableNames) {
    if (tablename !== '_prisma_migrations') {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${tablename}" CASCADE;`);
    }
  }
});

// Disconnect when done
afterAll(async () => {
  await prisma.$disconnect();
});
```

---

## Supertest Setup

We wrap the Express application in Supertest to simulate HTTP calls without binding to a network port.

```typescript
// test/utils/api.ts
import request from 'supertest';
import app from '@/app'; // The exported Express instance
import { generateTestToken } from './auth';

export const api = request(app);

// Helper to quickly get an authenticated agent
export const authApi = (role = 'ADMIN', tenantId = 1) => {
  const token = generateTestToken({ role, tenantId });
  return {
    get: (url: string) => api.get(url).set('Authorization', `Bearer ${token}`),
    post: (url: string) => api.post(url).set('Authorization', `Bearer ${token}`),
    // ...
  };
};
```

---

## Example: Endpoint Test

```typescript
// src/modules/assets/__tests__/asset.integration.test.ts
import { authApi, api } from '../../../../test/utils/api';
import { AssetFactory } from '../../../../test/factories/asset.factory';
import { prisma } from '@/config/prisma';

describe('POST /api/v1/assets', () => {
  it('should return 401 if unauthorized', async () => {
    const res = await api.post('/api/v1/assets').send({ name: 'Test' });
    expect(res.status).toBe(401);
  });

  it('should return 400 if validation fails', async () => {
    const request = authApi('ADMIN', 1);
    const res = await request.post('/api/v1/assets').send({}); // Missing name
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('Validation Failed');
  });

  it('should create an asset and return 201', async () => {
    // Note: In a real test, we would first create a Tenant and AssetType in the DB
    const request = authApi('ADMIN', 1);
    
    const payload = {
      name: 'Cooling Tower',
      assetTypeId: 1, // Assume seeded
      latitude: 40.71,
      longitude: -74.00
    };

    const res = await request.post('/api/v1/assets').send(payload);
    
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Cooling Tower');

    // Verify it actually hit the database
    const dbRecord = await prisma.asset.findUnique({ where: { id: res.body.id } });
    expect(dbRecord).toBeDefined();
    expect(dbRecord?.tenantId).toBe(1); // Ensure tenant isolation worked
  });
});
```

---

## Related Documents

- **Strategy:** [Testing Strategy](./00-testing-strategy.md)
- **Unit Testing:** [Backend Unit Testing](./01-unit-testing-backend.md)
- **Factories:** [Test Data Factories](./08-test-data-factories.md)
- **Index:** [IEKB Master Index](../00-foundation/00-IEKB-index.md)
