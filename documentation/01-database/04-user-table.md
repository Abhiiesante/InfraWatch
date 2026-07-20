# User Table

> **IEKB Section:** 01 — Database  
> **Document:** 04-user-table.md  
> **Last Updated:** 2026-07-16  
> **Owner:** Database Engineer  
> **Status:** Approved

---

## Overview

The `users` table stores all application users. Each user belongs to exactly one organization (tenant). Users are authenticated via email/password (JWT) and authorized via role-based access control (RBAC).

| Property | Value |
|----------|-------|
| **Table Name** | `users` |
| **Primary Key** | `id` (SERIAL) |
| **Tenant Scoped** | Yes (`tenant_id`) |
| **Soft Delete** | No (deactivate via `is_active`) |
| **Estimated Rows (Year 1)** | 500-5,000 |
| **RLS Enabled** | Yes |

---

## Schema Definition

```sql
CREATE TABLE "users" (
    "id"              SERIAL       PRIMARY KEY,
    "tenant_id"       INTEGER      NOT NULL REFERENCES "organizations"("id") ON DELETE RESTRICT,
    "name"            VARCHAR(255) NOT NULL,
    "email"           VARCHAR(320) NOT NULL,
    "hashed_password" TEXT         NOT NULL,
    "role"            VARCHAR(20)  NOT NULL DEFAULT 'INSPECTOR',
    "avatar_url"      TEXT,
    "phone"           VARCHAR(20),
    "is_active"       BOOLEAN      NOT NULL DEFAULT true,
    "last_login_at"   TIMESTAMPTZ,
    "created_at"      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    "updated_at"      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT "uq_users_tenant_id_email" UNIQUE ("tenant_id", "email"),
    CONSTRAINT "ck_users_valid_role" CHECK ("role" IN ('ADMIN', 'MANAGER', 'INSPECTOR'))
);
```

---

## Column Reference

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `SERIAL` | No | Auto-increment | Unique user identifier. |
| `tenant_id` | `INTEGER` | No | — | FK to `organizations.id`. Tenant boundary. |
| `name` | `VARCHAR(255)` | No | — | User's full name. |
| `email` | `VARCHAR(320)` | No | — | User's email. Unique within a tenant. RFC 5321 max is 320 chars. |
| `hashed_password` | `TEXT` | No | — | bcrypt-hashed password. Never exposed in API responses. |
| `role` | `VARCHAR(20)` | No | `'INSPECTOR'` | User role: `ADMIN`, `MANAGER`, `INSPECTOR`. |
| `avatar_url` | `TEXT` | Yes | `NULL` | URL to user's avatar image in S3. |
| `phone` | `VARCHAR(20)` | Yes | `NULL` | Phone number for notifications. |
| `is_active` | `BOOLEAN` | No | `true` | Active status. Inactive users cannot log in. |
| `last_login_at` | `TIMESTAMPTZ` | Yes | `NULL` | Timestamp of last successful login. |
| `created_at` | `TIMESTAMPTZ` | No | `NOW()` | Creation timestamp. |
| `updated_at` | `TIMESTAMPTZ` | No | `NOW()` | Last update timestamp. |

---

## Roles

| Role | Permissions | Description |
|------|------------|-------------|
| `ADMIN` | Full access | Manage organization settings, users, all data. Can delete entities. |
| `MANAGER` | Asset, inspection, incident management | Create/edit assets, cameras, inspections. Assign incidents. Generate reports. Cannot manage users or org settings. |
| `INSPECTOR` | Field operations | View assigned inspections, complete inspections, upload photos, report incidents. Read-only access to assets. |

See [RBAC Model](../02-auth/03-rbac-model.md) for the complete permissions matrix.

---

## Constraints & Indexes

### Constraints

| Name | Type | Definition | Purpose |
|------|------|-----------|---------|
| `uq_users_tenant_id_email` | Unique | `(tenant_id, email)` | Email unique per tenant (same email can exist in different orgs) |
| `ck_users_valid_role` | Check | `role IN ('ADMIN', 'MANAGER', 'INSPECTOR')` | Valid roles only |

### Indexes

| Name | Columns | Purpose |
|------|---------|---------|
| `idx_users_tenant_id` | `(tenant_id)` | Tenant-scoped queries |
| `idx_users_tenant_id_role` | `(tenant_id, role)` | Role-based filtering within a tenant |
| `idx_users_email` | `(email)` | Login lookup (global email search) |

---

## Common Queries

### Create User (Registration)

```typescript
async createUser(tenantId: number, data: CreateUserDto): Promise<User> {
  // Check if email already exists in this tenant
  const existing = await prisma.user.findUnique({
    where: { tenantId_email: { tenantId, email: data.email } },
  });
  if (existing) {
    throw new AppError('EMAIL_EXISTS', 'Email already registered in this organization', 409);
  }

  const hashedPassword = await bcrypt.hash(data.password, 12);

  return prisma.user.create({
    data: {
      tenantId,
      name: data.name,
      email: data.email.toLowerCase(),
      hashedPassword,
      role: data.role || 'INSPECTOR',
    },
    select: {
      id: true, tenantId: true, name: true, email: true,
      role: true, isActive: true, createdAt: true,
      // NEVER select hashedPassword
    },
  });
}
```

### Find by Email (Login)

```typescript
async findByEmail(email: string): Promise<UserWithPassword | null> {
  return prisma.user.findFirst({
    where: {
      email: email.toLowerCase(),
      isActive: true,
    },
    include: { organization: { select: { id: true, name: true, isActive: true } } },
  });
}
```

### List Users by Tenant

```typescript
async listByTenant(tenantId: number, options: ListOptions): Promise<PaginatedResult<User>> {
  const { page, limit, search, role } = options;
  const where: Prisma.UserWhereInput = {
    tenantId,
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ],
    }),
    ...(role && { role }),
  };

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where, skip: (page - 1) * limit, take: limit,
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, email: true, role: true, isActive: true, lastLoginAt: true, createdAt: true },
    }),
    prisma.user.count({ where }),
  ]);

  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}
```

### Update Last Login

```typescript
async updateLastLogin(userId: number): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { lastLoginAt: new Date() },
  });
}
```

### Change Password

```typescript
async changePassword(userId: number, currentPassword: string, newPassword: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError('USER_NOT_FOUND', 'User not found', 404);

  const isValid = await bcrypt.compare(currentPassword, user.hashedPassword);
  if (!isValid) throw new AppError('INVALID_PASSWORD', 'Current password is incorrect', 401);

  const hashedPassword = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: userId },
    data: { hashedPassword },
  });

  // Revoke all refresh tokens (force re-login on all devices)
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
```

---

## Business Rules

| Rule | Description | Enforcement |
|------|-------------|-------------|
| **Email unique per tenant** | Same email can exist in different orgs but not within the same org | DB UNIQUE constraint |
| **Email stored lowercase** | All emails normalized to lowercase on creation | Application logic |
| **Password requirements** | Min 8 chars, at least 1 uppercase, 1 lowercase, 1 number | Zod validation |
| **Password hashing** | bcrypt with work factor 12 | Application logic |
| **Never expose password** | `hashed_password` never included in API responses | Prisma select exclusion |
| **Admin minimum** | Every org must have at least 1 admin. Cannot deactivate the last admin. | Application logic |
| **Deactivation vs deletion** | Users are deactivated, not deleted. Preserves referential integrity for audit trail. | Application logic |
| **Role changes** | Only admins can change roles. Cannot change own role to non-admin if last admin. | Application logic + RBAC middleware |

---

## Seed Data

```typescript
const users = [
  // Org 1: TowerNet Communications
  { tenantId: 1, name: 'Rajesh Patel', email: 'rajesh@towernet.com', role: 'ADMIN', password: 'Admin@123' },
  { tenantId: 1, name: 'Priya Sharma', email: 'priya@towernet.com', role: 'INSPECTOR', password: 'Inspector@123' },
  { tenantId: 1, name: 'Amit Kumar', email: 'amit@towernet.com', role: 'MANAGER', password: 'Manager@123' },
  { tenantId: 1, name: 'Neha Singh', email: 'neha@towernet.com', role: 'INSPECTOR', password: 'Inspector@123' },
  // Org 2: SolarPower India
  { tenantId: 2, name: 'Ananya Krishnan', email: 'ananya@solarpower.in', role: 'ADMIN', password: 'Admin@123' },
  { tenantId: 2, name: 'Dev Kapoor', email: 'dev@solarpower.in', role: 'MANAGER', password: 'Manager@123' },
];
```

---

## Related Documents

- **Previous:** [Organization Table](./03-organization-table.md)
- **Next:** [Asset Type Table](./05-asset-type-table.md)
- **Auth:** [JWT Implementation](../02-auth/01-jwt-implementation.md) — Token generation for users
- **Auth:** [Password Security](../02-auth/02-password-security.md) — Hashing and policies
- **Auth:** [RBAC Model](../02-auth/03-rbac-model.md) — Role permissions matrix
- **Service:** [User Service](../03-backend/05-user-service.md)
- **Index:** [IEKB Master Index](../00-foundation/00-IEKB-index.md)
