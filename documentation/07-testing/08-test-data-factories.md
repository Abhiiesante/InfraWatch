# Test Data Factories

> **IEKB Section:** 07 — Testing  
> **Document:** 08-test-data-factories.md  
> **Last Updated:** 2026-07-16  
> **Owner:** QA Lead  
> **Status:** Approved

---

## Table of Contents

1. [Overview](#overview)
2. [Fishery Configuration](#fishery-configuration)
3. [Example: User and Tenant Factories](#example-user-and-tenant-factories)
4. [Using Factories in Integration Tests](#using-factories-in-integration-tests)
5. [Related Documents](#related-documents)

---

## Overview

Writing backend integration tests requires a populated database. Manually inserting records using `prisma.user.create()` leads to massive boilerplate, especially when models have complex relationships and non-nullable fields.

We use **Fishery** (by thoughtbot) to create test data factories. This allows us to define default data for models once, and easily override specific fields per test.

---

## Fishery Configuration

We define our factories in the `test/factories` directory.

```typescript
// test/factories/user.factory.ts
import { Factory } from 'fishery';
import { User, Role } from '@prisma/client';
import { prisma } from '@/config/prisma';
import { faker } from '@faker-js/faker';

export const userFactory = Factory.define<User>(({ sequence, onCreate }) => {
  // Define default values
  const user = {
    id: sequence,
    tenantId: 1, // Default tenant
    name: faker.person.fullName(),
    email: faker.internet.email(),
    passwordHash: '$2b$10$dummyhash...', 
    role: 'INSPECTOR' as Role,
    isActive: true,
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Tell Fishery how to save this to the DB when `factory.create()` is called
  onCreate(async (data) => {
    return prisma.user.create({ data });
  });

  return user;
});
```

---

## Example: User and Tenant Factories

When dealing with relationships, factories can build nested data.

```typescript
// test/factories/tenant.factory.ts
import { Factory } from 'fishery';
import { Organization } from '@prisma/client';
import { prisma } from '@/config/prisma';
import { faker } from '@faker-js/faker';

export const tenantFactory = Factory.define<Organization>(({ sequence, onCreate }) => {
  onCreate(async (data) => prisma.organization.create({ data }));
  
  return {
    id: sequence,
    name: faker.company.name(),
    domain: faker.internet.domainName(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
});
```

---

## Using Factories in Integration Tests

In your integration tests, you can use `.build()` to generate in-memory objects (useful for mocking), or `.create()` to insert them into the real database.

```typescript
import { userFactory } from '../../../../test/factories/user.factory';
import { tenantFactory } from '../../../../test/factories/tenant.factory';

describe('User Authentication', () => {
  it('should login successfully', async () => {
    // 1. Arrange: Setup DB State
    const tenant = await tenantFactory.create({ name: 'Acme Corp' });
    
    // Create a specific user overriding the defaults
    const admin = await userFactory.create({
      tenantId: tenant.id,
      email: 'admin@acme.com',
      role: 'ADMIN',
      // We pass a known hashed password for testing
      passwordHash: await hashPassword('Password123!'), 
    });

    // 2. Act: Hit API
    const res = await api.post('/api/v1/auth/login').send({
      email: 'admin@acme.com',
      password: 'Password123!'
    });

    // 3. Assert
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('ADMIN');
  });
});
```

---

## Related Documents

- **Strategy:** [Testing Strategy](./00-testing-strategy.md)
- **Integration Testing:** [Integration Testing Backend](./02-integration-testing-backend.md)
- **Index:** [IEKB Master Index](../00-foundation/00-IEKB-index.md)
