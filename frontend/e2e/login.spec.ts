import { test, expect } from '@playwright/test';

test('logs in and lands on profile', async ({ page }) => {
  await page.goto('/signin');
  await page.getByLabel(/Email/i).fill('e2e.user@example.com');
  await page.getByLabel(/Password/i).fill('secret123!');
  await page.getByRole('button', { name: /Sign in/i }).click();

  // Wait for something unique on /profile
  await expect(page.getByRole('heading', { name: /My Profile/i })).toBeVisible();
});