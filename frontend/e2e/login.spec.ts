import { test, expect } from '@playwright/test';

test('login page → redirect to profile on success', async ({ page }) => {
  await page.goto('/signin');
  await page.getByLabel(/email/i).fill('tester@example.com');
  await page.getByLabel(/password/i).fill('secret123');
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/profile$/);
});
