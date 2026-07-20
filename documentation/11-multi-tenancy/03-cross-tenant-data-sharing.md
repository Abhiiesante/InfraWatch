# Cross-Tenant Data Sharing (Unsupported)

> **IEKB Section:** 12 — Multi-Tenancy  
> **Document:** 03-cross-tenant-data-sharing.md  
> **Last Updated:** 2026-07-16  
> **Owner:** Backend Lead  
> **Status:** Approved

---

## Table of Contents

1. [Policy Declaration](#policy-declaration)
2. [User Accounts Across Tenants](#user-accounts-across-tenants)
3. [Future Considerations](#future-considerations)
4. [Related Documents](#related-documents)

---

## Policy Declaration

For InfraWatch V0, **Cross-Tenant Data Sharing is strictly unsupported**. 

An Asset, Camera, Inspection, or Incident created by Organization A cannot, under any circumstances, be viewed or interacted with by a user belonging to Organization B. The data is entirely siloed.

---

## User Accounts Across Tenants

Currently, a `User` record belongs to exactly one `Organization` (`tenantId`). 

If a contractor (e.g., an external inspector) works for both "Acme Corp" and "Globex Inc", they cannot use a single login to switch between the two organizations. 

They must be invited to both organizations separately and create two distinct accounts. Since the `email` field has a unique constraint combined with `tenantId` (`@@unique([tenantId, email])`), they can use the exact same email address for both accounts. The systems treats them as entirely separate entities with different passwords and different IDs.

---

## Future Considerations

In V2, if business requirements demand a "Contractor Portal" where a single user can switch between tenants using a single login, the architecture must change:

1. The `User` model would lose the `tenantId` field and move to the Global Scope.
2. A join table `TenantMembership` would be introduced to link a `User` to many `Organization`s with specific roles in each.
3. The Prisma RLS extensions would have to become significantly more complex, relying on the `TenantMembership` table to validate access.

**This is out of scope for V0 and V1.**

---

## Related Documents

- **Architecture:** [Tenancy Overview](./00-tenancy-overview.md)
- **Database:** [Database Schema](../01-database/00-schema-design.md)
- **Index:** [IEKB Master Index](../00-foundation/00-IEKB-index.md)
