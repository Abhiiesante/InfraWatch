# Tenant Onboarding & Offboarding

> **IEKB Section:** 12 — Multi-Tenancy  
> **Document:** 04-tenant-onboarding-offboarding.md  
> **Last Updated:** 2026-07-16  
> **Owner:** Backend Lead  
> **Status:** Approved

---

## Table of Contents

1. [Tenant Onboarding (Registration)](#tenant-onboarding-registration)
2. [Tenant Offboarding (Deletion)](#tenant-offboarding-deletion)
3. [Data Retention and Soft Deletes](#data-retention-and-soft-deletes)
4. [Related Documents](#related-documents)

---

## Tenant Onboarding (Registration)

For V0, self-service registration is disabled. Tenants must be onboarded by a System Administrator (a user with access to the SuperAdmin dashboard or via a direct API call).

When a new Organization is created, the system must automatically provision the foundational data:
1. Create the `Organization` record.
2. Create the initial `ADMIN` User for that organization and send them a password setup email via AWS SES.
3. Seed the default `AssetType` classifications (e.g., HVAC, Electrical, Plumbing) for that specific `tenantId`.

```typescript
// src/services/organization.service.ts
export class OrganizationService {
  static async provisionNewTenant(name: string, domain: string, adminEmail: string) {
    // This transaction runs on the GLOBAL prisma client, not the tenant-scoped one
    return await prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({ data: { name, domain } });
      
      const admin = await tx.user.create({
        data: {
          tenantId: org.id,
          email: adminEmail,
          role: 'ADMIN',
          passwordHash: 'pending', // Awaiting password reset flow
        }
      });

      // Seed default asset types for the new tenant
      await tx.assetType.createMany({
        data: [
          { tenantId: org.id, name: 'HVAC' },
          { tenantId: org.id, name: 'Plumbing' }
        ]
      });

      return { org, admin };
    });
  }
}
```

---

## Tenant Offboarding (Deletion)

Deleting a tenant is a highly destructive and irreversible action. For V0, it can only be performed by a System Admin.

Because we use a Shared Database, we rely on PostgreSQL's `ON DELETE CASCADE` constraints defined in our Prisma schema.

```prisma
// Example Prisma Schema
model Asset {
  id       Int          @id @default(autoincrement())
  tenantId Int
  tenant   Organization @relation(fields: [tenantId], references: [id], onDelete: Cascade)
}
```

When `prisma.organization.delete({ where: { id: 5 } })` is executed, the database engine will automatically and instantly delete every User, Asset, Camera, and Incident belonging to Tenant 5.

**Important Note regarding S3:**
Database cascade deletes do NOT delete files in Amazon S3. Before deleting the organization in the database, a background worker must be queued to iterate through all assets and delete the S3 objects under the `tenant_{id}` prefix.

---

## Data Retention and Soft Deletes

In V0, we do not support "Soft Deletes" (setting `isDeleted = true`) for Organizations. Deletions are hard. 

If a customer churns but requests a grace period, their `Organization.isActive` flag should be set to `false`, which will prevent all users from logging in, but leaves the data intact.

---

## Related Documents

- **Architecture:** [Tenancy Overview](./00-tenancy-overview.md)
- **Database:** [Database Schema](../01-database/00-schema-design.md)
- **Index:** [IEKB Master Index](../00-foundation/00-IEKB-index.md)
