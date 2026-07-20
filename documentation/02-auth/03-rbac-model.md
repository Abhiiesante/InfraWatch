# Role-Based Access Control (RBAC)

> **IEKB Section:** 02 — Auth  
> **Document:** 03-rbac-model.md  
> **Last Updated:** 2026-07-16  
> **Owner:** Security Engineer  
> **Status:** Approved

---

## Table of Contents

1. [Role Definitions](#role-definitions)
2. [Permissions Matrix](#permissions-matrix)
3. [Middleware Implementation](#middleware-implementation)
4. [Service-Level Authorization](#service-level-authorization)
5. [Frontend Route Guarding](#frontend-route-guarding)
6. [Related Documents](#related-documents)

---

## Role Definitions

InfraWatch V0 implements a strict, non-customizable 3-tier role hierarchy. Users have exactly **one role per organization**.

1. **ADMIN**: Full control over the organization, including billing (future), user management, and destructive operations (deleting data).
2. **MANAGER**: Operational control. Can create and modify infrastructure assets, schedule inspections, and manage incidents. Cannot manage users or org settings.
3. **INSPECTOR**: Field operative. Read-only access to infrastructure. Can only modify inspections assigned to them and create/comment on incidents.

---

## Permissions Matrix

| Entity | Action | ADMIN | MANAGER | INSPECTOR |
|--------|--------|-------|---------|-----------|
| **Org Settings** | View | ✅ | ❌ | ❌ |
| | Edit | ✅ | ❌ | ❌ |
| **Users** | View | ✅ | ✅ | ❌ |
| | Create/Edit | ✅ | ❌ | ❌ |
| | Deactivate | ✅ | ❌ | ❌ |
| **Assets/Types** | View | ✅ | ✅ | ✅ |
| | Create/Edit | ✅ | ✅ | ❌ |
| | Soft Delete | ✅ | ❌ | ❌ |
| **Cameras** | View | ✅ | ✅ | ✅ |
| | Create/Edit/Delete | ✅ | ✅ | ❌ |
| **Inspections** | View All | ✅ | ✅ | ❌ |
| | View Assigned | ✅ | ✅ | ✅ |
| | Schedule | ✅ | ✅ | ❌ |
| | Complete | ✅ | ✅ | ✅ (If assigned) |
| **Incidents** | View All | ✅ | ✅ | ✅ |
| | Create | ✅ | ✅ | ✅ |
| | Assign | ✅ | ✅ | ❌ |
| | Resolve/Close | ✅ | ✅ | ✅ (If assigned) |
| **Reports** | Generate | ✅ | ✅ | ❌ |
| | Download | ✅ | ✅ | ❌ |

---

## Middleware Implementation

RBAC is primarily enforced at the Express router level using the `requireRole` middleware.

```typescript
// src/middleware/rbac.ts
import { Request, Response, NextFunction } from 'express';
import { AppError } from '@/utils/errors';
import type { UserRole } from '@/types/user';

export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // req.user is populated by the authMiddleware
    const userRole = req.user?.role as UserRole;

    if (!userRole) {
      return next(new AppError('UNAUTHORIZED', 'Authentication required', 401));
    }

    if (!allowedRoles.includes(userRole)) {
      return next(
        new AppError(
          'FORBIDDEN', 
          `Access denied. Requires one of: ${allowedRoles.join(', ')}`, 
          403
        )
      );
    }

    next();
  };
};
```

### Usage in Routes

```typescript
// src/routes/asset.routes.ts
import { requireRole } from '@/middleware/rbac';

// Inspectors can read
router.get('/', requireRole('ADMIN', 'MANAGER', 'INSPECTOR'), controller.list);

// Only Admins and Managers can create/update
router.post('/', requireRole('ADMIN', 'MANAGER'), controller.create);
router.put('/:id', requireRole('ADMIN', 'MANAGER'), controller.update);

// Only Admins can delete
router.delete('/:id', requireRole('ADMIN'), controller.delete);
```

---

## Service-Level Authorization

While the middleware handles global role checks, **fine-grained, context-aware authorization** occurs in the Service layer.

Example: An `INSPECTOR` can hit the `PUT /inspections/:id/complete` endpoint (passes middleware), but the service must verify they are actually assigned to *that specific inspection*.

```typescript
// src/services/inspection.service.ts
async complete(tenantId: number, userId: number, userRole: string, inspectionId: number) {
  const inspection = await prisma.inspection.findUnique({
    where: { id: inspectionId }
  });

  // Verify existence and tenant
  if (!inspection || inspection.tenantId !== tenantId) {
    throw new AppError('NOT_FOUND', 'Inspection not found', 404);
  }

  // Context-aware authorization
  if (userRole === 'INSPECTOR') {
    if (inspection.inspectorId !== userId) {
      throw new AppError(
        'FORBIDDEN', 
        'Inspectors can only complete their own assigned inspections', 
        403
      );
    }
  }

  // Proceed with completion logic...
}
```

---

## Frontend Route Guarding

The React frontend hides UI elements and protects routes based on the JWT payload role. This is for **UX only**, not security (security is enforced on the backend).

### Protected Routes

```tsx
// src/components/auth/RoleRoute.tsx
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

interface RoleRouteProps {
  allowedRoles: string[];
}

export function RoleRoute({ allowedRoles }: RoleRouteProps) {
  const { user } = useAuthStore();

  if (!user) return <Navigate to="/login" replace />;
  
  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}

// src/router.tsx
<Route element={<RoleRoute allowedRoles={['ADMIN', 'MANAGER']} />}>
  <Route path="/assets/new" element={<AssetCreatePage />} />
  <Route path="/settings" element={<SettingsPage />} />
</Route>
```

### Component-Level Hiding

```tsx
// Example usage in a component
import { useAuthStore } from '@/stores/authStore';

export function AssetDetail({ asset }) {
  const { user } = useAuthStore();
  const canEdit = ['ADMIN', 'MANAGER'].includes(user?.role || '');

  return (
    <div>
      <h1>{asset.name}</h1>
      {/* Button is completely removed from DOM for Inspectors */}
      {canEdit && <Button onClick={editAsset}>Edit Asset</Button>}
    </div>
  );
}
```

---

## Related Documents

- **Previous:** [Password Security](./02-password-security.md)
- **Next:** [Tenant Context](./04-tenant-context.md)
- **API:** [Auth Endpoints](../04-api/02-auth-endpoints.md)
- **Database:** [User Table](../01-database/04-user-table.md)
- **Index:** [IEKB Master Index](../00-foundation/00-IEKB-index.md)
