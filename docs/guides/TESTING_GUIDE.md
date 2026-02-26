# Testing Guide

**Last Updated:** February 20, 2026

This guide explains how to run and write tests for the GSCC codebase.

---

## Test Structure

```
tests/
├── unit/                  # Unit tests (fast, isolated)
│   ├── player-validation.test.ts
│   └── fixture-validation.test.ts
├── integration/           # Integration tests (API/Function tests)
│   ├── player-management.test.ts
│   └── season-management.test.ts
├── e2e/                   # End-to-end tests (browser-based)
│   ├── homepage.spec.ts
│   ├── admin-login.spec.ts
│   └── gallery.spec.ts
├── fixtures/              # Test data & mocks
│   └── data.ts
└── setup.ts              # Test setup & configuration
```

---

## Running Tests

### Unit & Integration Tests (Vitest)

```bash
# Run all unit & integration tests
npm test

# Watch mode (re-runs on file changes)
npm run test:watch

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration

# Run with coverage report
npm run test:coverage

# Interactive UI mode
npm run test:ui
```

### E2E Tests (Playwright)

```bash
# First time setup - install browsers
npm run playwright:install

# Run all E2E tests
npm run test:e2e

# Run with UI mode (visual debugger)
npm run test:e2e:ui

# Run with browser visible
npm run test:e2e:headed

# Run specific test file
npx playwright test tests/e2e/homepage.spec.ts

# Run in specific browser
npx playwright test --project=chromium
```

### Run All Tests

```bash
# Run unit, integration, AND E2E tests
npm run test:all
```

---

## Test Coverage

### What's Tested

#### ✅ Unit Tests
- **Player Validation** - Data structure, email format, status filtering
- **Fixture Validation** - Date format, game numbers, sorting
- **Season Validation** - Team assignments, active status
- **Utility Functions** - Helper functions and data transformations

#### ✅ Integration Tests
- **Player Management** - CRUD operations, search, filtering
- **Season Management** - Create/read/update, active season logic
- **Fixture Management** - Scheduling, team assignments
- **Availability Tracking** - Player availability status
- **Statistics** - Calculation and aggregation

#### ✅ E2E Tests
- **Homepage** - Navigation, hero section, gallery carousel
- **Gallery** - Image loading, lightbox functionality
- **Admin Login** - Authentication flow, protected routes
- **Admin Dashboard** - Player management, fixture scheduling

### Coverage Reports

```bash
# Generate coverage report
npm run test:coverage

# View HTML report
open coverage/index.html
```

**Coverage Goals:**
- Unit tests: 80%+ coverage
- Integration tests: Core business logic covered
- E2E tests: Critical user flows covered

---

## Writing Tests

### Unit Test Example

```typescript
// tests/unit/my-feature.test.ts
import { describe, it, expect } from 'vitest';

describe('MyFeature', () => {
  it('should do something', () => {
    const result = myFunction('input');
    expect(result).toBe('expected output');
  });

  it('should handle edge cases', () => {
    expect(() => myFunction(null)).toThrow();
  });
});
```

### Integration Test Example

```typescript
// tests/integration/api-test.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { mockGetStore } from '../setup';

describe('API Integration', () => {
  const store = mockGetStore('my-store');

  beforeEach(async () => {
    // Clear store before each test
    const { blobs } = await store.list();
    for (const blob of blobs) {
      await store.delete(blob.key);
    }
  });

  it('should create and retrieve data', async () => {
    await store.set('key', JSON.stringify({ data: 'value' }));
    const result = await store.get('key');

    expect(result).toBeTruthy();
    expect(JSON.parse(result).data).toBe('value');
  });
});
```

### E2E Test Example

```typescript
// tests/e2e/my-page.spec.ts
import { test, expect } from '@playwright/test';

test('should load page', async ({ page }) => {
  await page.goto('/my-page');

  await expect(page).toHaveTitle(/My Page/i);
  await expect(page.locator('h1')).toContainText('Welcome');
});

test('should submit form', async ({ page }) => {
  await page.goto('/my-page');

  await page.fill('input[name="name"]', 'John Doe');
  await page.click('button[type="submit"]');

  await expect(page.locator('.success-message')).toBeVisible();
});
```

---

## Best Practices

### Unit Tests
- ✅ Test pure functions and validation logic
- ✅ Mock external dependencies
- ✅ Keep tests fast (< 100ms per test)
- ✅ Test edge cases and error conditions
- ❌ Don't test implementation details
- ❌ Don't test external libraries

### Integration Tests
- ✅ Test API endpoints and database operations
- ✅ Use mock stores (don't hit production)
- ✅ Test error handling and validation
- ✅ Clean up test data after each test
- ❌ Don't test UI in integration tests
- ❌ Don't make real HTTP requests

### E2E Tests
- ✅ Test critical user journeys
- ✅ Test on multiple browsers (Chrome, Firefox, Safari)
- ✅ Test mobile responsiveness
- ✅ Use data-testid attributes for stable selectors
- ❌ Don't test every single feature (slow and brittle)
- ❌ Don't test third-party integrations (mock them)

---

## Continuous Integration

### GitHub Actions (Coming Soon)

Tests will run automatically on:
- Every push to main branch
- Every pull request
- Scheduled daily runs

Example workflow:
```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm run test
      - run: npm run test:e2e
```

---

## Troubleshooting

### Vitest Issues

**Problem:** Tests fail with "Cannot find module"
```bash
# Solution: Check vitest.config.ts aliases
# Ensure paths match your project structure
```

**Problem:** Coverage reports missing files
```bash
# Solution: Update coverage.include in vitest.config.ts
```

### Playwright Issues

**Problem:** Browsers not installed
```bash
# Solution: Install browsers
npm run playwright:install
```

**Problem:** Tests timeout
```bash
# Solution: Increase timeout in playwright.config.ts
# Or use: test.setTimeout(60000);
```

**Problem:** Tests fail in CI but pass locally
```bash
# Solution: Run with same settings as CI
npm run test:e2e -- --project=chromium
```

---

## Test Data & Fixtures

Mock data is located in `tests/fixtures/data.ts`:

- `mockSeason` - Sample season data
- `mockPlayer` - Sample player data
- `mockFixture` - Sample fixture data
- `mockAdminUser` - Sample admin user
- `mockAvailability` - Sample availability data

**Usage:**
```typescript
import { mockPlayer, mockSeason } from '../fixtures/data';

// Use in tests
expect(myFunction(mockPlayer)).toBe(expected);
```

---

## Performance Benchmarks

### Test Execution Times

| Test Suite | Tests | Time | Status |
|------------|-------|------|--------|
| Unit | ~20 | < 2s | ✅ |
| Integration | ~15 | < 5s | ✅ |
| E2E (Chromium) | ~10 | < 30s | ✅ |
| E2E (All browsers) | ~50 | < 2m | ✅ |
| **Total** | **~100** | **< 3m** | ✅ |

---

## What to Test When Adding Features

### New API Endpoint
1. ✅ Unit test: Input validation
2. ✅ Integration test: Database operations
3. ✅ E2E test: If user-facing, test UI flow

### New UI Component
1. ✅ Unit test: Component props and rendering (if complex)
2. ✅ E2E test: User interaction and navigation

### New Utility Function
1. ✅ Unit test: All code paths and edge cases
2. ❌ Skip E2E test (unless user-facing)

### Bug Fix
1. ✅ Write regression test that fails
2. ✅ Fix the bug
3. ✅ Verify test now passes

---

## Resources

### Documentation
- [Vitest Docs](https://vitest.dev/) - Unit/integration testing
- [Playwright Docs](https://playwright.dev/) - E2E testing
- [Testing Library](https://testing-library.com/) - React testing utilities

### Example Tests
- `/tests/unit/` - Unit test examples
- `/tests/integration/` - Integration test examples
- `/tests/e2e/` - E2E test examples

---

## Getting Help

**Test failures?**
1. Read the error message carefully
2. Check test logs: `npm run test -- --reporter=verbose`
3. Debug with UI: `npm run test:ui` or `npm run test:e2e:ui`
4. Check this guide for common issues

**Need to write new tests?**
1. Copy similar existing test as template
2. Follow patterns in `/tests/` directory
3. Run tests frequently while developing
4. Aim for clear, readable test names

---

**See Also:**
- `/docs/guides/CODING_STANDARDS.md` - Code quality standards
- `/docs/implementation/STATUS.md` - Feature implementation status

---

**Pro Tips:**
- 💡 Run tests before committing: `npm run test:all`
- 💡 Write tests as you code, not after
- 💡 One assertion per test (when possible)
- 💡 Test names should read like documentation
- 💡 Mock external services (Netlify Blobs, APIs)
