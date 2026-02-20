/**
 * E2E Tests: Gallery Page
 * Tests for photo gallery functionality
 */

import { test, expect } from '@playwright/test';

test.describe('Gallery Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/gallery');
  });

  test('should load gallery page', async ({ page }) => {
    await expect(page).toHaveTitle(/gallery/i);
  });

  test('should display gallery images', async ({ page }) => {
    const images = page.locator('img[src*="/media/"]');
    const count = await images.count();

    expect(count).toBeGreaterThan(0);
  });

  test('should load images correctly', async ({ page }) => {
    // Wait for first image to load
    const firstImage = page.locator('img[src*="/media/"]').first();
    await expect(firstImage).toBeVisible({ timeout: 10000 });

    // Check if image loaded successfully
    const naturalWidth = await firstImage.evaluate(img => (img as HTMLImageElement).naturalWidth);
    expect(naturalWidth).toBeGreaterThan(0);
  });

  test('should open lightbox on image click', async ({ page }) => {
    const firstImage = page.locator('img[src*="/media/"]').first();
    await firstImage.click();

    // Wait for lightbox/modal to appear
    await page.waitForTimeout(500);

    // Lightbox should be visible (adjust selector based on implementation)
    const lightbox = page.locator('[class*="lightbox"], [class*="modal"], [role="dialog"]').first();
    await expect(lightbox).toBeVisible();
  });

  test('should close lightbox with escape key', async ({ page }) => {
    const firstImage = page.locator('img[src*="/media/"]').first();
    await firstImage.click();

    // Wait for lightbox to open
    await page.waitForTimeout(500);

    // Press Escape
    await page.keyboard.press('Escape');

    // Wait for lightbox to close
    await page.waitForTimeout(500);

    // Lightbox should be hidden
    const lightbox = page.locator('[class*="lightbox"], [class*="modal"], [role="dialog"]').first();
    const isVisible = await lightbox.isVisible().catch(() => false);
    expect(isVisible).toBe(false);
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    const images = page.locator('img[src*="/media/"]');
    const firstImage = images.first();

    await expect(firstImage).toBeVisible();
  });

  test('should have social media links', async ({ page }) => {
    // Check for Instagram or YouTube links
    const instagramLink = page.locator('a[href*="instagram"]').first();
    const youtubeLink = page.locator('a[href*="youtube"]').first();

    const hasInstagram = await instagramLink.isVisible().catch(() => false);
    const hasYoutube = await youtubeLink.isVisible().catch(() => false);

    expect(hasInstagram || hasYoutube).toBe(true);
  });

  test('should display page heading', async ({ page }) => {
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible();
    await expect(heading).toContainText(/gallery|photos/i);
  });
});
