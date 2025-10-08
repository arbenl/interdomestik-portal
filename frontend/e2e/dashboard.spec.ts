import { test, expect } from '@playwright/test';

test('member can view the dashboard page', async ({ page }) => {
  await page.goto('/signin');
  await page.getByLabel(/Email/i).fill('e2e.user@example.com');
  await page.getByLabel(/Password/i).fill('secret123!');
  await page.getByRole('button', { name: /Sign in/i }).click();

  await expect(
    page.getByRole('heading', { name: /My Profile/i })
  ).toBeVisible();

  await page.goto('/dashboard');

  await expect(page.getByRole('heading', { name: /Dashboard/i })).toBeVisible();
});
