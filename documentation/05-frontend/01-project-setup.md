# Frontend Project Setup

> **IEKB Section:** 05 — Frontend  
> **Document:** 01-project-setup.md  
> **Last Updated:** 2026-07-16  
> **Owner:** Frontend Lead  
> **Status:** Approved

---

## Table of Contents

1. [Environment Variables](#environment-variables)
2. [Axios Interceptor Setup](#axios-interceptor-setup)
3. [Tailwind & PostCSS Configuration](#tailwind--postcss-configuration)
4. [Vite Configuration](#vite-configuration)
5. [Related Documents](#related-documents)

---

## Environment Variables

Like the backend, the frontend relies on environment variables, but they must be prefixed with `VITE_` to be exposed to the browser. We validate these at application startup.

```typescript
// src/config/env.ts
import { z } from 'zod';

const envSchema = z.object({
  VITE_API_URL: z.string().url(),
  VITE_APP_ENV: z.enum(['development', 'staging', 'production']),
});

// Parse `import.meta.env` (Vite's way of exposing env vars)
const _env = envSchema.safeParse(import.meta.env);

if (!_env.success) {
  console.error('Invalid environment variables:', _env.error.format());
  throw new Error('Invalid environment variables');
}

export const env = _env.data;
```

---

## Axios Interceptor Setup

All API requests are made using a pre-configured Axios instance. This instance handles injecting the Access Token, attempting silent refreshes on 401s, and global error handling.

```typescript
// src/lib/api.ts
import axios from 'axios';
import { env } from '@/config/env';
import { useAuthStore } from '@/features/auth/store';

export const api = axios.create({
  baseURL: env.VITE_API_URL,
  withCredentials: true, // Crucial for sending HttpOnly refresh cookies
});

// Request Interceptor: Attach Access Token
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response Interceptor: Handle 401s and Token Refresh
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 Unauthorized and not already retrying
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue the request until refresh is done
        return new Promise(function(resolve, reject) {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers['Authorization'] = 'Bearer ' + token;
          return api(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Attempt to refresh
        const { data } = await axios.post(`${env.VITE_API_URL}/auth/refresh`, {}, { withCredentials: true });
        
        useAuthStore.getState().setToken(data.accessToken);
        processQueue(null, data.accessToken);
        
        originalRequest.headers['Authorization'] = `Bearer ${data.accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        // If refresh fails, log the user out
        useAuthStore.getState().logout();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
```

---

## Tailwind & PostCSS Configuration

InfraWatch uses a custom Tailwind configuration to enforce the design system tokens.

```javascript
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(215, 100%, 50%)", // InfraWatch Blue
          foreground: "hsl(0, 0%, 100%)",
        },
        // ... standard shadcn color variables ...
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
```

---

## Vite Configuration

We use Vite's path aliasing to allow clean imports like `@/components/Button`.

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    // Proxy API requests in dev to avoid CORS issues if not running on same domain
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      }
    }
  }
});
```

---

## Related Documents

- **Architecture:** [Frontend Architecture](./00-frontend-architecture.md)
- **State:** [State Management](./02-state-management.md)
- **Auth:** [Auth Pages & Flow](./04-auth-pages.md)
- **Index:** [IEKB Master Index](../00-foundation/00-IEKB-index.md)
