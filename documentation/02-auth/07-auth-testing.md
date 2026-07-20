# Auth Testing Strategies

> **IEKB Section:** 02 — Auth  
> **Document:** 07-auth-testing.md  
> **Last Updated:** 2026-07-16  
> **Owner:** QA Engineer  
> **Status:** Approved

---

## Table of Contents

1. [Overview](#overview)
2. [Unit Testing (Jest)](#unit-testing-jest)
3. [Integration Testing (Supertest)](#integration-testing-supertest)
4. [E2E Testing (Playwright)](#e2e-testing-playwright)
5. [Security & Penetration Testing](#security--penetration-testing)
6. [Related Documents](#related-documents)

---

## Overview

Authentication and Authorization are the most critical security boundaries in InfraWatch. Testing these layers requires a multi-tiered approach:
- **Unit Tests:** Verify utility functions (hashing, JWT generation).
- **Integration Tests:** Verify route protection, middleware pipelines, and token lifecycle (login, refresh, logout).
- **E2E Tests:** Verify UI behavior, cookie handling, and role-based component hiding in the browser.

---

## Unit Testing (Jest)

Unit tests focus on isolated logic without database connections.

### JWT Generation & Verification

```typescript
// tests/unit/utils/jwt.test.ts
import { generateAccessToken } from '@/utils/jwt';
import jwt from 'jsonwebtoken';

describe('JWT Utils', () => {
  it('should generate a valid access token', () => {
    const payload = { sub: 1, email: 'test@test.com', tenantId: 1, role: 'ADMIN' };
    const token = generateAccessToken(payload);
    
    expect(typeof token).toBe('string');
    
    const decoded = jwt.decode(token) as any;
    expect(decoded.sub).toBe(1);
    expect(decoded.tenantId).toBe(1);
    expect(decoded.exp).toBeDefined();
  });
});
```

### Password Hashing

```typescript
// tests/unit/utils/password.test.ts
import { hashPassword, verifyPassword } from '@/utils/password';

describe('Password Utils', () => {
  it('should hash and verify successfully', async () => {
    const plaintext = 'SecurePass123!';
    const hash = await hashPassword(plaintext);
    
    expect(hash).not.toBe(plaintext);
    
    const isValid = await verifyPassword(plaintext, hash);
    expect(isValid).toBe(true);
    
    const isInvalid = await verifyPassword('WrongPass123!', hash);
    expect(isInvalid).toBe(false);
  });
});
```

---

## Integration Testing (Supertest)

Integration tests spin up the Express app and connect to a test database to verify actual HTTP flows.

### Testing the Login Flow

```typescript
// tests/integration/auth/login.test.ts
import request from 'supertest';
import { app } from '@/app';
import { prisma } from '@/config/prisma';
import { createTestUser } from '../../factories/userFactory';

describe('POST /api/v1/auth/login', () => {
  beforeAll(async () => {
    await createTestUser({ email: 'login@test.com', password: 'Password@123' });
  });

  it('should return access token and set HttpOnly refresh cookie on valid credentials', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'login@test.com', password: 'Password@123' });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('accessToken');
    
    // Check for HttpOnly cookie
    const cookies = response.headers['set-cookie'];
    expect(cookies).toBeDefined();
    expect(cookies[0]).toMatch(/refresh_token=/);
    expect(cookies[0]).toMatch(/HttpOnly/);
  });

  it('should return 401 on invalid password', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'login@test.com', password: 'WrongPassword!' });

    expect(response.status).toBe(401);
  });
});
```

### Testing RBAC Middleware

```typescript
// tests/integration/middleware/rbac.test.ts
import request from 'supertest';
import { app } from '@/app';
import { generateAccessToken } from '@/utils/jwt';

describe('RBAC Middleware', () => {
  it('should deny INSPECTOR access to ADMIN routes', async () => {
    const token = generateAccessToken({ sub: 1, email: 't@t.com', tenantId: 1, role: 'INSPECTOR' });
    
    const response = await request(app)
      .delete('/api/v1/assets/1') // Requires ADMIN
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(403);
    expect(response.body.message).toMatch(/Requires one of: ADMIN/);
  });
});
```

---

## E2E Testing (Playwright)

End-to-End tests run in a real browser to verify the frontend interacts correctly with the authentication system.

### Login UI Flow

```typescript
// e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('successful login redirects to dashboard', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('input[name="email"]', 'admin@towernet.com');
    await page.fill('input[name="password"]', 'Password@123');
    await page.click('button[type="submit"]');

    // Wait for redirect
    await expect(page).toHaveURL('/dashboard');
    
    // Verify auth state is saved
    const token = await page.evaluate(() => localStorage.getItem('auth-storage'));
    expect(token).toContain('accessToken');
  });

  test('role-based UI: Inspector cannot see Settings', async ({ page }) => {
    // Custom command to login as specific role
    await page.loginAsRole('INSPECTOR'); 
    
    await page.goto('/dashboard');
    
    // The Settings link should not exist in the DOM
    await expect(page.locator('text="Settings"')).toHaveCount(0);
    
    // Direct navigation should redirect to unauthorized
    await page.goto('/settings');
    await expect(page).toHaveURL('/unauthorized');
  });
});
```

---

## Security & Penetration Testing

Automated security checks should be included in the CI pipeline:

1. **Token Fuzzing:** Send malformed, unsigned, or differently-signed JWTs to protected routes to ensure they fail gracefully (401).
2. **Cross-Tenant Checks:** Authenticate as Tenant 1, attempt to fetch/modify resources belonging to Tenant 2. Should always result in 404 or 403.
3. **Rate Limit Checks:** Attempt 20 rapid logins and verify the 429 Too Many Requests response triggers correctly.

---

## Related Documents

- **Auth Overview:** [Auth Overview](./00-auth-overview.md)
- **General Testing:** [Testing Strategy](../08-testing/00-testing-strategy.md)
- **API Endpoints:** [Auth Endpoints](../04-api/02-auth-endpoints.md)
- **Index:** [IEKB Master Index](../00-foundation/00-IEKB-index.md)
