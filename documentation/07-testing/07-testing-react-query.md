# Testing React Query Hooks

> **IEKB Section:** 07 — Testing  
> **Document:** 07-testing-react-query.md  
> **Last Updated:** 2026-07-16  
> **Owner:** Frontend Lead  
> **Status:** Approved

---

## Table of Contents

1. [Overview](#overview)
2. [Wrapper Setup](#wrapper-setup)
3. [Mocking API Responses (MSW)](#mocking-api-responses-msw)
4. [Example: Testing a Custom Hook](#example-testing-a-custom-hook)
5. [Related Documents](#related-documents)

---

## Overview

When unit testing components or custom hooks that use `@tanstack/react-query`, we must provide a `QueryClientProvider` and mock the underlying network requests. 

We do **not** mock Axios directly. Instead, we use **Mock Service Worker (MSW)** to intercept network requests at the node level. This provides a much more robust and realistic testing environment.

---

## Wrapper Setup

We create a custom render function and a wrapper component that initializes a fresh `QueryClient` for every test to prevent cache pollution across tests.

```tsx
// test/utils/react-query.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import React from 'react';

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // Turn off retries for faster tests
        cacheTime: Infinity,
      },
      mutations: {
        retry: false,
      }
    },
  });
}

export function renderWithClient(ui: React.ReactElement) {
  const testQueryClient = createTestQueryClient();
  const { rerender, ...result } = render(
    <QueryClientProvider client={testQueryClient}>{ui}</QueryClientProvider>
  );
  
  return {
    ...result,
    rerender: (rerenderUi: React.ReactElement) =>
      rerender(
        <QueryClientProvider client={testQueryClient}>{rerenderUi}</QueryClientProvider>
      ),
  };
}
```

---

## Mocking API Responses (MSW)

Configure MSW to intercept requests to our API.

```typescript
// test/mocks/server.ts
import { setupServer } from 'msw/node';
import { rest } from 'msw';

export const handlers = [
  rest.get('http://localhost:3000/api/v1/dashboard/metrics', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({ totalAssets: 10, activeCameras: 5 })
    );
  }),
];

export const server = setupServer(...handlers);
```

Register the server in the Vitest setup file:

```typescript
// test/setup.ts
import { server } from './mocks/server';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

---

## Example: Testing a Custom Hook

We use `@testing-library/react-hooks` (now part of core RTL in React 18) to test custom React Query hooks directly.

```typescript
// src/features/dashboard/api/__tests__/useDashboardMetrics.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { useDashboardMetrics } from '../useDashboardMetrics';
import { createTestQueryClient } from '../../../../../test/utils/react-query';
import { QueryClientProvider } from '@tanstack/react-query';
import { server } from '../../../../../test/mocks/server';
import { rest } from 'msw';

describe('useDashboardMetrics', () => {
  it('should fetch metrics successfully', async () => {
    const queryClient = createTestQueryClient();
    
    const { result } = renderHook(() => useDashboardMetrics(), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      ),
    });

    // Wait for the query to resolve
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual({ totalAssets: 10, activeCameras: 5 });
  });

  it('should handle errors gracefully', async () => {
    // Override the default MSW handler for this specific test
    server.use(
      rest.get('http://localhost:3000/api/v1/dashboard/metrics', (req, res, ctx) => {
        return res(ctx.status(500));
      })
    );

    const queryClient = createTestQueryClient();
    
    const { result } = renderHook(() => useDashboardMetrics(), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      ),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
```

---

## Related Documents

- **Frontend State:** [State Management](../05-frontend/02-state-management.md)
- **Unit Testing:** [Frontend Unit Testing](./06-unit-testing-frontend.md)
- **Index:** [IEKB Master Index](../00-foundation/00-IEKB-index.md)
