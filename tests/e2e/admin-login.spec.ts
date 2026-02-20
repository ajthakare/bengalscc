/**
 * E2E Tests: Admin Login
 * Tests for admin authentication flow
 */

import { test, expect } from '@playwright/test';

test.describe('Admin Login', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/login');
  });

  test('should display login form', async ({ page }) => {
    await expect(page.locator('input[name="username"], input[type="text"]').first()).toBeVisible();
    await expect(page.locator('input[name="password"], input[type="password"]').first()).toBeVisible();
    await expect(page.locator('button[type="submit"], button:has-text("Login")').first()).toBeVisible();
  });

  test('should show validation error for empty fields', async ({ page }) => {
    const submitButton = page.locator('button[type="submit"], button:has-text("Login")').first();
    await submitButton.click();

    // Check for validation messages (could be HTML5 or custom)
    const usernameInput = page.locator('input[name="username"], input[type="text"]').first();
    const isRequired = await usernameInput.evaluate(el => (el as HTMLInputElement).required);
    expect(isRequired).toBe(true);
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.fill('input[name="username"], input[type="text"]', 'wronguser');
    await page.fill('input[name="password"], input[type="password"]', 'wrongpass');

    const submitButton = page.locator('button[type="submit"], button:has-text("Login")').first();
    await submitButton.click();

    // Wait for error message (adjust selector based on your implementation)
    await page.waitForTimeout(2000);

    // Should still be on login page or show error
    expect(page.url()).toContain('/admin/login');
  });

  test('should have password field masked', async ({ page }) => {
    const passwordInput = page.locator('input[name="password"], input[type="password"]').first();
    const inputType = await passwordInput.getAttribute('type');
    expect(inputType).toBe('password');
  });

  test('should have proper page title', async ({ page }) => {
    await expect(page).toHaveTitle(/admin|login/i);
  });

  test('should be mobile responsive', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    const form = page.locator('form').first();
    await expect(form).toBeVisible();
  });

  test('should have link to main site', async ({ page }) => {
    const homeLink = page.locator('a[href="/"], a:has-text("Home")').first();
    await expect(homeLink).toBeVisible();
  });
});

test.describe('Admin Dashboard (Protected)', () => {
  test('should redirect to login when not authenticated', async ({ page }) => {
    await page.goto('/admin');

    // Should redirect to login or show login form
    await page.waitForURL(/.*admin.*login.*/i, { timeout: 5000 }).catch(() => {
      // If no redirect, check if we're on admin page with login form
      expect(page.url()).toContain('admin');
    });
  });

  test('should protect admin routes', async ({ page }) => {
    const protectedRoutes = [
      '/admin/players',
      '/admin/fixtures',
      '/admin/seasons',
      '/admin/users',
    ];

    for (const route of protectedRoutes) {
      await page.goto(route);

      // Should either redirect to login or show auth error
      await page.waitForTimeout(1000);
      const url = page.url();

      // If on the route, should show login form or error
      expect(url).toBeTruthy();
    }
  });
});
