# Auth Pages & Flow

> **IEKB Section:** 05 — Frontend  
> **Document:** 04-auth-pages.md  
> **Last Updated:** 2026-07-16  
> **Owner:** Frontend Lead  
> **Status:** Approved

---

## Table of Contents

1. [Overview](#overview)
2. [Login Page Implementation](#login-page-implementation)
3. [Password Recovery Flow](#password-recovery-flow)
4. [Session Expiry Handling](#session-expiry-handling)
5. [Related Documents](#related-documents)

---

## Overview

The authentication feature module handles user sign-in, session recovery (refresh token rotation), and password resets. Since V0 does not include public sign-ups (accounts are provisioned by Admins), there is no registration page.

---

## Login Page Implementation

The `LoginPage` uses `react-hook-form` and `zod` for validation, and a React Query mutation to submit the credentials.

### Component Structure

```tsx
// src/features/auth/routes/LoginPage.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store';
import { useLogin } from '../api/useLogin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const setToken = useAuthStore(state => state.setToken);
  const setUser = useAuthStore(state => state.setUser);
  
  const loginMutation = useLogin();
  
  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema)
  });

  const onSubmit = (data: LoginFormValues) => {
    loginMutation.mutate(data, {
      onSuccess: (response) => {
        // 1. Save state to Zustand
        setToken(response.accessToken);
        setUser(response.user);
        
        // 2. Redirect back to where they tried to go, or Dashboard
        const from = location.state?.from?.pathname || '/';
        navigate(from, { replace: true });
      }
    });
  };

  return (
    <div className="flex h-screen items-center justify-center bg-muted/50">
      <div className="w-full max-w-md p-8 space-y-6 bg-card rounded-xl shadow-lg border">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-primary">InfraWatch</h1>
          <p className="text-sm text-muted-foreground mt-2">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...register('email')} />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <a href="/forgot-password" className="text-sm text-primary hover:underline">
                Forgot password?
              </a>
            </div>
            <Input id="password" type="password" {...register('password')} />
            {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
          </div>

          {loginMutation.isError && (
            <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
              {(loginMutation.error as any).response?.data?.error?.message || 'Login failed'}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loginMutation.isLoading}>
            {loginMutation.isLoading ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>
      </div>
    </div>
  );
};
```

---

## Password Recovery Flow

The password recovery consists of two pages:
1. `ForgotPasswordPage`: Prompts for an email address. Submits to `/api/v1/auth/forgot-password`. Always shows a generic success message to prevent user enumeration.
2. `ResetPasswordPage`: Accessed via the link sent in the email (e.g., `/reset-password?token=xyz`). Prompts for a new password and submits to `/api/v1/auth/reset-password`.

---

## Session Expiry Handling

Since Access Tokens expire quickly (e.g., 15 minutes), the Axios response interceptor handles silent refresh requests.

However, if the Refresh Token expires (e.g., after 7 days) or is revoked, the refresh request will fail with a `401 Unauthorized`. 

When this happens, the Axios interceptor immediately calls `useAuthStore.getState().logout()`. This clears the Zustand state, which triggers a re-render. The `<RequireAuth>` route guard detects the missing token and automatically redirects the user to the `/login` page, passing their current path in `location.state.from` so they can resume work after signing back in.

---

## Related Documents

- **Routing:** [Routing & Navigation](./03-routing-navigation.md)
- **Backend API:** [Auth Endpoints](../04-api/02-auth-endpoints.md)
- **State:** [State Management](./02-state-management.md)
- **Index:** [IEKB Master Index](../00-foundation/00-IEKB-index.md)
