/**
 * E2E Tests: Homepage
 * Tests for public homepage functionality
 */

import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load homepage successfully', async ({ page }) => {
    await expect(page).toHaveTitle(/Golden State Cricket Club|GSCC/i);
  });

  test('should display hero section', async ({ page }) => {
    const hero = page.locator('h1, [class*="hero"]').first();
    await expect(hero).toBeVisible();
  });

  test('should display navigation menu', async ({ page }) => {
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();

    // Check for key navigation links
    await expect(page.getByRole('link', { name: /about/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /gallery/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /contact/i })).toBeVisible();
  });

  test('should display team statistics', async ({ page }) => {
    // Look for stats like "4 Teams", "Active Members", etc.
    const statsSection = page.locator('[class*="stat"]').first();
    await expect(statsSection).toBeVisible();
  });

  test('should display gallery carousel', async ({ page }) => {
    // Check if gallery/media section exists
    const gallery = page.locator('[class*="gallery"], [class*="media"]').first();
    await expect(gallery).toBeVisible({ timeout: 10000 });
  });

  test('should have working navigation links', async ({ page }) => {
    // Test About link
    await page.click('text=/about/i');
    await expect(page).toHaveURL(/.*aboutus/);
  });

  test('should be mobile responsive', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('nav')).toBeVisible();
  });

  test('should load images without errors', async ({ page }) => {
    const images = await page.locator('img').all();

    for (const img of images.slice(0, 5)) { // Check first 5 images
      const src = await img.getAttribute('src');
      expect(src).toBeTruthy();
    }
  });

  test('should have footer with contact info', async ({ page }) => {
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();

    // Check for email or social media links
    const links = await footer.locator('a').all();
    expect(links.length).toBeGreaterThan(0);
  });
});
