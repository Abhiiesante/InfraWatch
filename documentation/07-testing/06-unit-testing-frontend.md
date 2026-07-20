# Frontend Unit Testing

> **IEKB Section:** 07 — Testing  
> **Document:** 06-unit-testing-frontend.md  
> **Last Updated:** 2026-07-16  
> **Owner:** Frontend Lead  
> **Status:** Approved

---

## Table of Contents

1. [Scope of Frontend Unit Tests](#scope-of-frontend-unit-tests)
2. [Vitest & React Testing Library](#vitest--react-testing-library)
3. [Testing Pure Functions](#testing-pure-functions)
4. [Testing UI Components](#testing-ui-components)
5. [Related Documents](#related-documents)

---

## Scope of Frontend Unit Tests

In InfraWatch, we do **not** write unit tests for every React component. Testing components that merely render data fetched from the API is often brittle and provides low ROI. Those are covered by our Playwright E2E tests.

We write Frontend Unit Tests for:
1. **Utility Functions:** Complex data transformations, date formatters, math calculations.
2. **Complex State Hooks:** Custom hooks that manage complex local state (not covered by React Query).
3. **Highly Interactive Components:** Components with complex internal logic, like the Kanban drag-and-drop board or dynamic forms with intricate validation rules.

---

## Vitest & React Testing Library

We use **Vitest** as our test runner (because it shares the Vite configuration and is significantly faster than Jest) and **React Testing Library (RTL)** for component rendering.

```typescript
// vite.config.ts (Vitest setup)
/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './test/setup.ts', // Imports jest-dom matchers
  },
});
```

---

## Testing Pure Functions

Pure functions should be tested exhaustively with various inputs and edge cases.

```typescript
// src/utils/__tests__/formatters.test.ts
import { formatCurrency, truncateText } from '../formatters';

describe('formatters', () => {
  describe('truncateText', () => {
    it('should not truncate text shorter than length', () => {
      expect(truncateText('Hello', 10)).toBe('Hello');
    });

    it('should truncate and add ellipsis', () => {
      expect(truncateText('Hello World', 5)).toBe('Hello...');
    });
  });
});
```

---

## Testing UI Components

When testing UI components, always test from the user's perspective (finding elements by Role, Label, or Text) rather than implementation details (like CSS classes).

```tsx
// src/components/ui/__tests__/Button.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '../Button';

describe('Button Component', () => {
  it('renders correctly', () => {
    render(<Button>Click Me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  it('handles click events', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn(); // Vitest mock function
    
    render(<Button onClick={handleClick}>Submit</Button>);
    
    await user.click(screen.getByRole('button', { name: /submit/i }));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is passed', () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

---

## Related Documents

- **Strategy:** [Testing Strategy](./00-testing-strategy.md)
- **E2E:** [E2E Testing Guide](./03-e2e-testing-guide.md)
- **Data Fetching:** [Testing React Query](./07-testing-react-query.md)
- **Index:** [IEKB Master Index](../00-foundation/00-IEKB-index.md)
