# User Service

> **IEKB Section:** 03 — Backend  
> **Document:** 05-user-service.md  
> **Last Updated:** 2026-07-16  
> **Owner:** Backend Lead  
> **Status:** Approved

---

## Table of Contents

1. [Overview](#overview)
2. [Service Implementation](#service-implementation)
3. [Business Rules Enforced](#business-rules-enforced)
4. [Related Documents](#related-documents)

---

## Overview

The `UserService` handles CRUD operations for users within a specific tenant. It enforces rules around role assignment, admin minimums, and handles the bcrypt hashing of passwords during creation.

All methods in this service (except password reset flows) require `tenantId` as the first parameter.

---

## Service Implementation

```typescript
// src/modules/users/user.service.ts
import { prisma } from '@/config/prisma';
import { hashPassword } from '@/utils/password';
import { AppError } from '@/utils/errors';
import type { CreateUserDto, UpdateUserDto } from './user.schema';

export class UserService {
  
  /**
   * Retrieves a paginated list of active users for a tenant.
   */
  async list(tenantId: number, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    
    // Note: tenantId injection is handled by Prisma Extension
    const [items, total] = await Promise.all([
      prisma.user.findMany({
        skip, take: limit,
        orderBy: { name: 'asc' },
        select: {
          id: true, name: true, email: true, 
          role: true, isActive: true, lastLoginAt: true
          // CRITICAL: Never select hashedPassword
        }
      }),
      prisma.user.count()
    ]);

    return { items, total, page, limit };
  }

  /**
   * Creates a new user. Enforces unique email per tenant.
   */
  async create(tenantId: number, data: CreateUserDto) {
    // 1. Enforce lowercase email
    const email = data.email.toLowerCase();

    // 2. Check for existing email in this tenant
    const existing = await prisma.user.findUnique({
      where: { tenantId_email: { tenantId, email } }
    });

    if (existing) {
      throw new AppError('CONFLICT', 'Email already registered in this organization', 409);
    }

    // 3. Hash password
    const hashedPassword = await hashPassword(data.password);

    // 4. Create user
    return prisma.user.create({
      data: {
        tenantId,
        name: data.name,
        email,
        hashedPassword,
        role: data.role || 'INSPECTOR',
      },
      select: { id: true, name: true, email: true, role: true }
    });
  }

  /**
   * Deactivates a user. 
   * We never hard-delete users to preserve audit trails and foreign keys (e.g. createdById on assets).
   */
  async deactivate(tenantId: number, userId: number, requestingUserId: number) {
    // 1. Cannot deactivate yourself
    if (userId === requestingUserId) {
      throw new AppError('FORBIDDEN', 'You cannot deactivate your own account', 403);
    }

    // 2. Fetch user to verify they are an admin
    const userToDeactivate = await prisma.user.findFirst({
      where: { id: userId, tenantId }
    });

    if (!userToDeactivate) throw new AppError('NOT_FOUND', 'User not found', 404);

    // 3. Rule: Cannot deactivate the last admin
    if (userToDeactivate.role === 'ADMIN') {
      const adminCount = await prisma.user.count({
        where: { tenantId, role: 'ADMIN', isActive: true }
      });
      
      if (adminCount <= 1) {
        throw new AppError('CONFLICT', 'Cannot deactivate the last admin in the organization', 409);
      }
    }

    // 4. Deactivate and revoke refresh tokens
    return prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { isActive: false }
      }),
      prisma.refreshToken.updateMany({
        where: { userId },
        data: { revokedAt: new Date() }
      })
    ]);
  }
}

export const userService = new UserService();
```

---

## Business Rules Enforced

1. **Email Uniqueness:** Handled safely via the `tenantId_email` composite unique constraint check.
2. **Password Isolation:** The service explicitly selects fields to return, ensuring `hashedPassword` is never accidentally leaked to the controller.
3. **Soft Deletion:** Users are deactivated (`isActive: false`), never deleted. This prevents `ON DELETE CASCADE` from wiping out all assets/inspections created by that user.
4. **Last Admin Protection:** The service prevents deactivating the last active `ADMIN` in a tenant, which would permanently lock the organization out of management features.
5. **Session Revocation:** Deactivating a user instantly revokes all their active refresh tokens, forcing them out of the system.

---

## Related Documents

- **Database:** [User Table](../01-database/04-user-table.md)
- **Auth:** [Password Security](../02-auth/02-password-security.md)
- **Index:** [IEKB Master Index](../00-foundation/00-IEKB-index.md)
