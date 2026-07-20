# Organization Service

> **IEKB Section:** 03 — Backend  
> **Document:** 04-org-service.md  
> **Last Updated:** 2026-07-16  
> **Owner:** Backend Lead  
> **Status:** Approved

---

## Table of Contents

1. [Overview](#overview)
2. [Tenant Provisioning Workflow](#tenant-provisioning-workflow)
3. [Service Implementation](#service-implementation)
4. [Controller Interface](#controller-interface)
5. [Related Documents](#related-documents)

---

## Overview

The `OrganizationService` handles the creation and management of the root multi-tenant entity: the Organization (Tenant). 

Unlike most services in InfraWatch, the `provision` method of this service is **not** scoped to an existing tenant, as it creates the tenant itself.

---

## Tenant Provisioning Workflow

When a new customer signs up, we cannot simply create a row in the `organizations` table. We must provision an entire isolated environment for them within the shared database.

**The Transactional Provisioning Flow:**
1. Create the `Organization` record.
2. Create the default `TenantSettings` record.
3. Create default `AssetTypes` (e.g., "Camera", "Sensor") so they aren't presented with a blank slate.
4. Hash the password and create the first `User` with the `ADMIN` role.
5. Create an initial `AuditLog` entry.

If any step fails, the entire transaction rolls back.

---

## Service Implementation

```typescript
// src/modules/organizations/org.service.ts
import { prisma } from '@/config/prisma';
import { hashPassword } from '@/utils/password';
import { AppError } from '@/utils/errors';
import type { CreateOrgDto } from './org.schema';

export class OrganizationService {
  
  /**
   * Provisions a completely new tenant and their first admin user.
   * Runs outside of the standard Tenant Context.
   */
  async provisionTenant(data: CreateOrgDto) {
    // 1. Check for domain conflict globally
    const existingOrg = await prisma.organization.findUnique({
      where: { domain: data.domain }
    });
    
    if (existingOrg) {
      throw new AppError('CONFLICT', 'An organization with this domain already exists', 409);
    }

    const hashedPassword = await hashPassword(data.adminPassword);

    // 2. Execute massive Provisioning Transaction
    return prisma.$transaction(async (tx) => {
      
      // A. Create Org
      const org = await tx.organization.create({
        data: {
          name: data.companyName,
          domain: data.domain,
          plan: 'STARTER', // Default plan
        }
      });

      // B. Create Settings
      await tx.tenantSetting.create({
        data: {
          tenantId: org.id,
          timezone: data.timezone || 'UTC',
        }
      });

      // C. Create Default Asset Types
      await tx.assetType.createMany({
        data: [
          { tenantId: org.id, name: 'Facility', icon: 'building' },
          { tenantId: org.id, name: 'Equipment', icon: 'box' },
        ]
      });

      // D. Create Admin User
      const admin = await tx.user.create({
        data: {
          tenantId: org.id,
          name: data.adminName,
          email: data.adminEmail.toLowerCase(),
          hashedPassword,
          role: 'ADMIN',
        }
      });

      // E. Log Audit
      await tx.auditLog.create({
        data: {
          tenantId: org.id,
          userId: admin.id,
          action: 'TENANT_PROVISIONED',
          entityType: 'ORGANIZATION',
          entityId: org.id,
        }
      });

      return { org, admin };
    });
  }

  /**
   * Scoped update for existing tenants.
   * First argument MUST be tenantId.
   */
  async updateSettings(tenantId: number, settings: Partial<any>) {
    return prisma.tenantSetting.update({
      where: { tenantId },
      data: settings,
    });
  }
}

export const orgService = new OrganizationService();
```

---

## Controller Interface

The controller exposes the provisioning endpoint publicly, while settings updates are protected by RBAC.

```typescript
// src/modules/organizations/org.controller.ts
import { Request, Response } from 'express';
import { catchAsync } from '@/utils/asyncHandler';
import { orgService } from './org.service';

class OrgController {
  
  // Public Route (No auth/tenant middleware)
  register = catchAsync(async (req: Request, res: Response) => {
    const result = await orgService.provisionTenant(req.body);
    
    res.status(201).json({
      message: 'Organization provisioned successfully',
      organization: { id: result.org.id, name: result.org.name },
      admin: { id: result.admin.id, email: result.admin.email }
    });
  });

  // Protected Route (Requires authMiddleware + tenantMiddleware + requireRole('ADMIN'))
  updateSettings = catchAsync(async (req: Request, res: Response) => {
    const { tenantId } = req.tenantContext;
    const updated = await orgService.updateSettings(tenantId, req.body);
    
    res.status(200).json(updated);
  });
}

export const orgController = new OrgController();
```

---

## Related Documents

- **Database:** [Organization Table](../01-database/03-organization-table.md)
- **Multi-Tenancy:** [Tenant Provisioning](../12-multitenancy/02-tenant-provisioning.md)
- **Index:** [IEKB Master Index](../00-foundation/00-IEKB-index.md)
