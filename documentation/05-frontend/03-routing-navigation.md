# Routing & Navigation

> **IEKB Section:** 05 — Frontend  
> **Document:** 03-routing-navigation.md  
> **Last Updated:** 2026-07-16  
> **Owner:** Frontend Lead  
> **Status:** Approved

---

## Table of Contents

1. [React Router Configuration](#react-router-configuration)
2. [Layout Components](#layout-components)
3. [Route Guards (Protected Routes)](#route-guards-protected-routes)
4. [Role-Based Access Control (RBAC)](#role-based-access-control-rbac)
5. [Related Documents](#related-documents)

---

## React Router Configuration

InfraWatch V0 uses **React Router v6**. We use the object-based `createBrowserRouter` API, which enables advanced features like data loaders, error boundaries, and nested layouts.

```typescript
// src/app/router.tsx
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

// Layouts
import { RootLayout } from './layouts/RootLayout';
import { AuthLayout } from './layouts/AuthLayout';
import { DashboardLayout } from './layouts/DashboardLayout';

// Route Guards
import { RequireAuth } from './guards/RequireAuth';
import { RequireGuest } from './guards/RequireGuest';

// Feature Pages
import { LoginPage } from '@/features/auth/routes/LoginPage';
import { DashboardPage } from '@/features/dashboard/routes/DashboardPage';
import { AssetsListPage } from '@/features/assets/routes/AssetsListPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />, // Handles global providers (React Query, Toast)
    errorElement: <GlobalErrorPage />,
    children: [
      // Public / Guest Only Routes
      {
        element: <RequireGuest><AuthLayout /></RequireGuest>,
        children: [
          { path: 'login', element: <LoginPage /> },
          { path: 'forgot-password', element: <ForgotPasswordPage /> },
        ]
      },
      // Protected Routes
      {
        element: <RequireAuth><DashboardLayout /></RequireAuth>,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: 'assets', element: <AssetsListPage /> },
          // ... nested routes
        ]
      }
    ]
  }
]);

export const AppRouter = () => <RouterProvider router={router} />;
```

---

## Layout Components

Layouts define the visual shell around the child route components via the `<Outlet />` component.

### Dashboard Layout

The `DashboardLayout` is responsible for rendering the persistent Sidebar navigation, the Top Header (containing the user profile dropdown), and the main content area.

```tsx
// src/app/layouts/DashboardLayout.tsx
import { Outlet } from 'react-router-dom';
import { Sidebar } from '@/components/Navigation/Sidebar';
import { Header } from '@/components/Navigation/Header';

export const DashboardLayout = () => {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-muted/20">
          <Outlet /> {/* Child pages render here */}
        </main>
      </div>
    </div>
  );
};
```

---

## Route Guards (Protected Routes)

We use wrapper components to enforce authentication requirements before rendering a route.

```tsx
// src/app/guards/RequireAuth.tsx
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store';

export const RequireAuth = ({ children }: { children: JSX.Element }) => {
  const { accessToken } = useAuthStore();
  const location = useLocation();

  if (!accessToken) {
    // Redirect to login, saving the attempted URL
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};
```

---

## Role-Based Access Control (RBAC)

While the backend is the ultimate source of truth for authorization, the frontend must also hide links, buttons, and entire pages that the user does not have permission to access.

### Route Level RBAC

We create a specific guard for roles.

```tsx
// src/app/guards/RequireRole.tsx
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store';
import type { Role } from '@/features/auth/types';

interface Props {
  allowedRoles: Role[];
  children: JSX.Element;
}

export const RequireRole = ({ allowedRoles, children }: Props) => {
  const { user } = useAuthStore();

  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};
```

**Usage in Router:**
```tsx
{ 
  path: 'settings', 
  element: (
    <RequireRole allowedRoles={['ADMIN', 'MANAGER']}>
      <SettingsPage />
    </RequireRole>
  ) 
}
```

### Component Level RBAC

To hide specific buttons (e.g., the "Delete Asset" button), we create a reusable utility hook or wrapper.

```tsx
// src/hooks/useAuthorization.ts
import { useAuthStore } from '@/features/auth/store';
import type { Role } from '@/features/auth/types';

export const useAuthorization = () => {
  const { user } = useAuthStore();

  const checkAccess = (allowedRoles: Role[]) => {
    if (!user) return false;
    return allowedRoles.includes(user.role);
  };

  return { checkAccess, role: user?.role };
};

// Usage in Component
const { checkAccess } = useAuthorization();

return (
  <div>
    <h1>Asset Details</h1>
    {checkAccess(['ADMIN']) && (
      <Button variant="destructive">Delete Asset</Button>
    )}
  </div>
);
```

---

## Related Documents

- **Architecture:** [Frontend Architecture](./00-frontend-architecture.md)
- **Auth:** [Auth Pages](./04-auth-pages.md)
- **Backend RBAC:** [RBAC Model](../02-auth/03-rbac-model.md)
- **Index:** [IEKB Master Index](../00-foundation/00-IEKB-index.md)
