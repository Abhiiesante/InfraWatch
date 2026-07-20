# Password Security & Hashing

> **IEKB Section:** 02 — Auth  
> **Document:** 02-password-security.md  
> **Last Updated:** 2026-07-16  
> **Owner:** Security Engineer  
> **Status:** Approved

---

## Table of Contents

1. [Hashing Algorithm](#hashing-algorithm)
2. [Password Policies](#password-policies)
3. [Implementation Reference](#implementation-reference)
4. [Account Recovery Flow](#account-recovery-flow)
5. [Database Protection](#database-protection)
6. [Related Documents](#related-documents)

---

## Hashing Algorithm

InfraWatch uses **bcrypt** for password hashing. bcrypt is an adaptive, salt-aware hashing function based on the Blowfish cipher, designed to resist brute-force search attacks by remaining deliberately slow.

### Configuration

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| **Algorithm** | bcrypt | Industry standard, proven track record |
| **Work Factor (Cost)** | 12 | Requires ~300ms per hash on current hardware. Balances UX (login speed) with resistance to brute forcing. |
| **Salt** | Auto-generated | 128-bit cryptographically secure salt generated per user. |

---

## Password Policies

All incoming passwords are validated via Zod schemas before reaching the database layer.

### Complexity Rules

```typescript
// src/schemas/auth.schema.ts
import { z } from 'zod';

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password cannot exceed 72 characters') // bcrypt limitation
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[\W_]/, 'Password must contain at least one special character');
```

### Rate Limiting

To prevent brute force and credential stuffing attacks on the login endpoint:

```typescript
// src/middleware/rateLimit.ts
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { redis } from '@/config/redis';

// 5 failed attempts per 15 minutes per IP
export const loginRateLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args: string[]) => redis.call(...args),
  }),
  windowMs: 15 * 60 * 1000, 
  max: 5,
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});
```

---

## Implementation Reference

### Password Hashing Service

```typescript
// src/utils/password.ts
import bcrypt from 'bcryptjs';

const WORK_FACTOR = 12;

/**
 * Hashes a plaintext password using bcrypt with a generated salt.
 */
export async function hashPassword(plaintext: string): Promise<string> {
  return bcrypt.hash(plaintext, WORK_FACTOR);
}

/**
 * Compares a plaintext password against a stored hash in constant time.
 */
export async function verifyPassword(plaintext: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plaintext, hash);
}
```

### Changing Passwords

When a user changes their password, all active sessions must be invalidated.

```typescript
// Inside auth.service.ts
async function changePassword(userId: number, currentPass: string, newPass: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  
  const isValid = await verifyPassword(currentPass, user.hashedPassword);
  if (!isValid) throw new AppError('UNAUTHORIZED', 'Invalid current password', 401);

  const newHash = await hashPassword(newPass);

  await prisma.$transaction([
    // 1. Update password
    prisma.user.update({
      where: { id: userId },
      data: { hashedPassword: newHash },
    }),
    
    // 2. Revoke all existing refresh tokens
    prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
    
    // 3. Log the action
    prisma.auditLog.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        action: 'PASSWORD_CHANGE',
        entityType: 'USER',
        entityId: user.id,
      }
    })
  ]);
}
```

---

## Account Recovery Flow

1. **Initiate:** User requests reset via `/api/v1/auth/forgot-password` with their email.
2. **Token Generation:** System generates a secure, short-lived (15 min) JWT `resetToken`.
3. **Delivery:** System emails a link containing the token: `https://app.infrawatch.com/reset-password?token=XYZ`
4. **Fulfillment:** User submits new password to `/api/v1/auth/reset-password` with the token.
5. **Validation:** System verifies the token, hashes the new password, updates the DB, and revokes all refresh tokens.

> [!NOTE]
> The forgot-password endpoint always returns a generic `200 OK` ("If the email exists, a link was sent") to prevent email enumeration attacks.

---

## Database Protection

To prevent accidental exposure of password hashes:

1. **Prisma Select Exclusions:** The `hashedPassword` field is explicitly omitted from almost all Prisma queries.
2. **Never Return in API:** The Express response serialization layer strips `hashedPassword` if it accidentally slips through.
3. **Audit Logs:** Passwords (plaintext or hashed) are **never** included in the `old_values` or `new_values` of the `audit_logs` table.

```typescript
// Example: Safe user selection
const user = await prisma.user.findUnique({
  where: { id: userId },
  select: {
    id: true,
    name: true,
    email: true,
    role: true,
    isActive: true,
    // hashedPassword is intentionally omitted
  },
});
```

---

## Related Documents

- **Previous:** [JWT Implementation](./01-jwt-implementation.md)
- **Next:** [RBAC Model](./03-rbac-model.md)
- **Database:** [User Table](../01-database/04-user-table.md)
- **Index:** [IEKB Master Index](../00-foundation/00-IEKB-index.md)
