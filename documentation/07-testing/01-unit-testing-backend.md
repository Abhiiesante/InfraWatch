# Backend Unit Testing

> **IEKB Section:** 07 — Testing  
> **Document:** 01-unit-testing-backend.md  
> **Last Updated:** 2026-07-16  
> **Owner:** Backend Lead  
> **Status:** Approved

---

## Table of Contents

1. [Scope of Unit Tests](#scope-of-unit-tests)
2. [Mocking Prisma](#mocking-prisma)
3. [Example: Service Unit Test](#example-service-unit-test)
4. [Mocking External Services](#mocking-external-services)
5. [Related Documents](#related-documents)

---

## Scope of Unit Tests

In the InfraWatch backend, Unit Tests are reserved for testing **Services** and **Utilities** in complete isolation. We do not unit test Controllers (those are covered by Integration Tests).

The goal is to verify that business logic (like state machine transitions for Incidents) executes correctly and throws the expected `AppError` exceptions when rules are violated, without needing a real database.

---

## Mocking Prisma

Since Services rely heavily on `prisma`, we must mock the Prisma Client. We use `jest-mock-extended` to provide type-safe mocks of the Prisma models.

```typescript
// test/mocks/prisma.ts
import { PrismaClient } from '@prisma/client';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { prisma } from '@/config/prisma';

jest.mock('@/config/prisma', () => ({
  __esModule: true,
  prisma: mockDeep<PrismaClient>(),
}));

// Export the mocked instance for use in tests
export const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>;
```

---

## Example: Service Unit Test

Here is an example testing the Incident state machine logic within the `IncidentService`.

```typescript
// src/modules/incidents/__tests__/incident.service.test.ts
import { IncidentService } from '../incident.service';
import { prismaMock } from '../../../../test/mocks/prisma';
import { AppError } from '@/middlewares/error.middleware';

describe('IncidentService', () => {
  const tenantId = 1;

  describe('updateStatus', () => {
    it('should throw an error if transitioning from OPEN to RESOLVED directly', async () => {
      // Arrange: Mock the database response
      prismaMock.incident.findUnique.mockResolvedValue({
        id: 100,
        tenantId,
        status: 'OPEN',
        // ... other fields
      } as any);

      // Act & Assert
      await expect(
        IncidentService.updateStatus(tenantId, 100, 'RESOLVED')
      ).rejects.toThrow(AppError);
      
      await expect(
        IncidentService.updateStatus(tenantId, 100, 'RESOLVED')
      ).rejects.toMatchObject({ statusCode: 400 });
      
      // Verify save was never called
      expect(prismaMock.incident.update).not.toHaveBeenCalled();
    });

    it('should allow transition from IN_PROGRESS to RESOLVED', async () => {
      // Arrange
      prismaMock.incident.findUnique.mockResolvedValue({
        id: 100,
        tenantId,
        status: 'IN_PROGRESS',
      } as any);

      prismaMock.incident.update.mockResolvedValue({
        id: 100,
        status: 'RESOLVED'
      } as any);

      // Act
      const result = await IncidentService.updateStatus(tenantId, 100, 'RESOLVED');

      // Assert
      expect(result.status).toBe('RESOLVED');
      expect(prismaMock.incident.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 100, tenantId }
      }));
    });
  });
});
```

---

## Mocking External Services

Services often call external APIs (like AWS SES for emails) or enqueue jobs (BullMQ). These must also be mocked.

```typescript
// Example mocking BullMQ
import { notificationQueue } from '@/queues';

jest.mock('@/queues', () => ({
  notificationQueue: {
    add: jest.fn().mockResolvedValue(true)
  }
}));

// Inside test:
expect(notificationQueue.add).toHaveBeenCalledWith('send-alert', expect.any(Object), expect.any(Object));
```

---

## Related Documents

- **Strategy:** [Testing Strategy](./00-testing-strategy.md)
- **Integration:** [Integration Testing](./02-integration-testing-backend.md)
- **Index:** [IEKB Master Index](../00-foundation/00-IEKB-index.md)
