# State Management Strategy

> **IEKB Section:** 05 — Frontend  
> **Document:** 02-state-management.md  
> **Last Updated:** 2026-07-16  
> **Owner:** Frontend Lead  
> **Status:** Approved

---

## Table of Contents

1. [Server State vs UI State](#server-state-vs-ui-state)
2. [Server State: React Query](#server-state-react-query)
3. [Global UI State: Zustand](#global-ui-state-zustand)
4. [Form State: React Hook Form](#form-state-react-hook-form)
5. [URL State](#url-state)
6. [Related Documents](#related-documents)

---

## Server State vs UI State

InfraWatch strongly differentiates between data that comes from the backend (Server State) and data that represents the current state of the application interface (UI State).

Mixing these two into a massive Redux store is a known anti-pattern that leads to excessive boilerplate and stale data.

- **Server State:** Handled exclusively by React Query.
- **Global UI State:** Handled by Zustand.
- **Local UI State:** Handled by `useState` / `useReducer`.
- **URL State:** Handled by React Router (Query parameters).

---

## Server State: React Query

We wrap Axios calls inside React Query hooks located in the `api/` folder of each feature.

### Hook Definition

```typescript
// src/features/assets/api/useAssets.ts
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { PaginatedResult, Asset } from '../types';

interface UseAssetsParams {
  page: number;
  limit: number;
  search?: string;
  status?: string;
}

export const useAssets = (params: UseAssetsParams) => {
  return useQuery({
    // Query key must include ALL dependencies
    queryKey: ['assets', params],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResult<Asset>>('/v1/assets', { params });
      return data;
    },
    // Keep previous data on screen while fetching the next page
    keepPreviousData: true, 
  });
};
```

### Optimistic Updates

When mutating data (e.g., resolving an incident), we use React Query's `onMutate` to instantly update the UI before the server responds, reverting on failure.

```typescript
// src/features/incidents/api/useUpdateStatus.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export const useUpdateIncidentStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }) => api.patch(`/v1/incidents/${id}/status`, { status }),
    onMutate: async ({ id, status }) => {
      // 1. Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['incidents'] });

      // 2. Snapshot previous state
      const previous = queryClient.getQueryData(['incidents']);

      // 3. Optimistically update the cache
      queryClient.setQueryData(['incidents'], (old: any) => {
        // ... deep update logic here ...
      });

      // 4. Return context for rollback
      return { previous };
    },
    onError: (err, variables, context) => {
      // Rollback on failure
      queryClient.setQueryData(['incidents'], context.previous);
    },
    onSettled: () => {
      // Invalidate to ensure we have the truth from the server
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
    }
  });
};
```

---

## Global UI State: Zustand

For state that needs to be accessed globally but isn't tied to the server (e.g., Auth Session, Sidebar visibility, Theme), we use Zustand.

```typescript
// src/features/auth/store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from './types';

interface AuthState {
  accessToken: string | null;
  user: User | null;
  setToken: (token: string) => void;
  setUser: (user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      setToken: (token) => set({ accessToken: token }),
      setUser: (user) => set({ user }),
      logout: () => set({ accessToken: null, user: null }),
    }),
    {
      name: 'auth-storage', // Saves to localStorage
    }
  )
);
```

---

## Form State: React Hook Form

Forms are state-heavy and trigger excessive re-renders if built with native controlled inputs (`useState`). We use **React Hook Form (RHF)** paired with **Zod** for schema validation.

```typescript
// src/features/assets/components/AssetForm.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateAsset } from '../api/useCreateAsset';

const schema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  assetTypeId: z.coerce.number().positive("Required"),
});

export const AssetForm = () => {
  const mutation = useCreateAsset();
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema)
  });

  const onSubmit = (data) => {
    mutation.mutate(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register("name")} />
      {errors.name && <span>{errors.name.message}</span>}
      <button type="submit" disabled={mutation.isLoading}>Save</button>
    </form>
  );
};
```

---

## URL State

Pagination, search filters, and active tabs should **always** be stored in the URL query string, not in `useState`. This ensures that if a user copies the URL and sends it to a colleague, the exact same view is loaded.

```typescript
import { useSearchParams } from 'react-router-dom';

const AssetListPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Read from URL
  const page = parseInt(searchParams.get('page') || '1');
  const search = searchParams.get('search') || '';

  // Write to URL (triggers a re-render)
  const handleSearch = (term: string) => {
    setSearchParams(prev => {
      prev.set('search', term);
      prev.set('page', '1'); // Reset pagination on new search
      return prev;
    });
  };

  // Pass to React Query
  const { data } = useAssets({ page, limit: 20, search });
  
  // ...
};
```

---

## Related Documents

- **Architecture:** [Frontend Architecture](./00-frontend-architecture.md)
- **Setup:** [Project Setup](./01-project-setup.md)
- **Routing:** [Routing & Navigation](./03-routing-navigation.md)
- **Index:** [IEKB Master Index](../00-foundation/00-IEKB-index.md)
