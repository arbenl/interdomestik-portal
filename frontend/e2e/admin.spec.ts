import { test, expect } from '@playwright/test';

test('Admin Login and Panel Access', async ({ page }) => {
  // Navigate to the sign-in page
  await page.goto('/signin');

  // Fill in the admin credentials from the seed script
  await page.fill('input[type="email"]', 'admin@example.com');
  await page.fill('input[type="password"]', 'Passw0rd!');

  // Click the sign-in button
  await page.click('button[type="submit"]');

  // Wait for navigation to the admin panel
  await page.waitForURL('/admin');

  // Check that the Admin Panel heading is visible
  const heading = page.locator('h2', { hasText: 'Admin Panel' });
  await expect(heading).toBeVisible();
});
