# Frontend Architecture Overview

> **IEKB Section:** 05 — Frontend  
> **Document:** 00-frontend-architecture.md  
> **Last Updated:** 2026-07-16  
> **Owner:** Frontend Lead  
> **Status:** Approved

---

## Table of Contents

1. [Core Technologies](#core-technologies)
2. [Application Structure](#application-structure)
3. [Design System Paradigm](#design-system-paradigm)
4. [Component Hierarchy](#component-hierarchy)
5. [Data Fetching Strategy](#data-fetching-strategy)
6. [Related Documents](#related-documents)

---

## Core Technologies

InfraWatch V0 is built as a Single Page Application (SPA) prioritizing rapid development, type safety, and a highly responsive user experience.

- **Framework:** React 18
- **Build Tool:** Vite (for fast HMR and optimized builds)
- **Language:** TypeScript (Strict mode enabled)
- **Routing:** React Router v6
- **Data Fetching:** TanStack Query (React Query)
- **State Management:** Zustand (for global UI state), React Context (for Auth/Tenant)
- **Styling:** Tailwind CSS + shadcn/ui
- **Forms:** React Hook Form + Zod

---

## Application Structure

The `frontend/` directory is organized by feature rather than strictly by file type (e.g., all components in one folder, all hooks in another). This feature-based architecture scales better as the application grows.

```
frontend/
├── src/
│   ├── app/                # Global app setup (Router, Providers)
│   ├── assets/             # Static assets (images, global css)
│   ├── components/         # Shared UI components (shadcn, generic buttons)
│   ├── config/             # Environment variables, constants
│   ├── hooks/              # Global custom hooks
│   ├── lib/                # Third-party library wrappers (axios, utils)
│   ├── types/              # Global TS interfaces
│   │
│   └── features/           # Feature-based modules
│       ├── auth/
│       │   ├── api/        # React Query hooks for auth endpoints
│       │   ├── components/ # Auth-specific components (LoginForm)
│       │   ├── routes/     # Auth pages (Login, ForgotPassword)
│       │   └── types/      # Auth-specific TS types
│       │
│       ├── assets/         # Asset management feature
│       ├── cameras/        # Camera & streaming feature
│       ├── inspections/    # Inspection forms and lists
│       ├── incidents/      # Incident reporting and tracking
│       └── dashboard/      # Main overview dashboard
```

---

## Design System Paradigm

We do not use heavy component libraries like Material-UI or Ant Design, which are notoriously difficult to customize. 

Instead, we use **Tailwind CSS** for utility-class styling and **shadcn/ui** for accessible component primitives. 

Shadcn/ui is not an npm package; rather, we copy/paste the source code of the components (Buttons, Dialogs, Tables) directly into `src/components/ui`. This gives us 100% ownership of the markup and styling, allowing us to tweak animations and exact pixel values to achieve the required premium aesthetic.

---

## Component Hierarchy

Components in InfraWatch are divided into three distinct categories:

1. **Primitives (UI Components):** 
   - Located in `src/components/ui/`
   - Highly reusable, entirely stateless, dumb components.
   - Examples: `Button`, `Input`, `Modal`, `Table`.
   
2. **Feature Components:**
   - Located in `src/features/{feature}/components/`
   - Specific to a domain. Can contain business logic and local state, but usually do not fetch their own data.
   - Examples: `AssetStatusBadge`, `IncidentCommentList`, `CameraConfigForm`.

3. **Page/Route Components:**
   - Located in `src/features/{feature}/routes/`
   - The top-level components rendered by React Router.
   - Responsible for fetching data via React Query, managing URL state, and passing props down to Feature Components.
   - Examples: `AssetsListPage`, `AssetDetailsPage`.

---

## Data Fetching Strategy

We use **TanStack Query (React Query)** exclusively for server state. We never use `useEffect` to fetch data.

React Query handles:
- Caching and deduping requests.
- Background refetching (stale-while-revalidate).
- Loading and error states automatically.
- Optimistic updates for immediate UI feedback.

Global UI state (like sidebar toggle, dark mode) is handled by **Zustand**, which is lighter and less boilerplate-heavy than Redux.

---

## Related Documents

- **Next:** [Project Setup](./01-project-setup.md)
- **State:** [State Management](./02-state-management.md)
- **Routing:** [Routing & Navigation](./03-routing-navigation.md)
- **Index:** [IEKB Master Index](../00-foundation/00-IEKB-index.md)
