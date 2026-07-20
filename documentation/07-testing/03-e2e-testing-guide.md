# End-to-End (E2E) Testing Guide

> **IEKB Section:** 07 — Testing  
> **Document:** 03-e2e-testing-guide.md  
> **Last Updated:** 2026-07-16  
> **Owner:** QA Lead  
> **Status:** Approved

---

## Table of Contents

1. [Overview](#overview)
2. [Playwright Configuration](#playwright-configuration)
3. [Page Object Model (POM)](#page-object-model-pom)
4. [Example: Complete Incident Flow](#example-complete-incident-flow)
5. [Related Documents](#related-documents)

---

## Overview

End-to-End (E2E) tests are the ultimate source of truth. They boot up the frontend, the backend, and a real database, and simulate a user clicking through the application in a real browser (Chromium, Firefox, WebKit).

We use **Playwright** because of its speed, auto-waiting capabilities, and built-in tracing/video recording for debugging failed CI runs.

---

## Playwright Configuration

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173', // Frontend URL
    trace: 'on-first-retry',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // Safari and Firefox configured for CI runs
  ],
  // Playwright can start the app for you
  webServer: [
    {
      command: 'npm run start:api',
      url: 'http://localhost:3000/health',
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'npm run start:web',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
    }
  ]
});
```

---

## Page Object Model (POM)

To keep tests readable and maintainable if the UI changes, we use the Page Object Model pattern. We define classes that represent pages and encapsulate the DOM selectors and actions.

```typescript
// tests/e2e/pages/LoginPage.ts
import { Page, expect } from '@playwright/test';

export class LoginPage {
  constructor(public readonly page: Page) {}

  async goto() {
    await this.page.goto('/login');
  }

  async login(email: string, password: string = 'Password123!') {
    await this.page.fill('input[name="email"]', email);
    await this.page.fill('input[name="password"]', password);
    await this.page.click('button[type="submit"]');
    
    // Auto-wait until the URL changes to the dashboard
    await expect(this.page).toHaveURL('/');
  }
}
```

---

## Example: Complete Incident Flow

This test validates the entire lifecycle of an incident from the UI perspective.

```typescript
// tests/e2e/incident.spec.ts
import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';

test.describe('Incident Management Flow', () => {
  // Use a fresh seeded user for each test block
  const testUser = 'admin@test.com'; 

  test('should create, assign, and resolve an incident', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(testUser);

    // 1. Navigate to Incidents
    await page.click('text=Incidents');
    await expect(page).toHaveURL('/incidents');

    // 2. Report New Incident
    await page.click('button:has-text("Report Incident")');
    await page.fill('input[name="title"]', 'Leaking Pipe');
    await page.fill('textarea[name="description"]', 'Water on the floor');
    await page.click('button:has-text("Submit")');

    // Verify it appears in the OPEN column of the Kanban board
    const openColumn = page.locator('[data-rbd-droppable-id="OPEN"]');
    await expect(openColumn.locator('text=Leaking Pipe')).toBeVisible();

    // 3. Navigate to details and add a comment
    await page.click('text=Leaking Pipe');
    await page.fill('textarea[placeholder="Add a comment..."]', 'Investigating now');
    await page.click('button:has-text("Send")');
    
    // Verify comment appears in thread
    await expect(page.locator('.comment-thread', { hasText: 'Investigating now' })).toBeVisible();

    // 4. Resolve Incident via status dropdown
    await page.click('button:has-text("Update Status")');
    await page.click('text=RESOLVED');

    // Verify status badge changed
    await expect(page.locator('.status-badge')).toHaveText('RESOLVED');
  });
});
```

---

## Related Documents

- **Strategy:** [Testing Strategy](./00-testing-strategy.md)
- **Frontend:** [Routing & Navigation](../05-frontend/03-routing-navigation.md)
- **Index:** [IEKB Master Index](../00-foundation/00-IEKB-index.md)
