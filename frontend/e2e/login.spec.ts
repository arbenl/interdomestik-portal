import { test, expect } from '@playwright/test';

test('login page → redirect to dashboard on success', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('tester@example.com');
  await page.getByLabel('Password').fill('secret123');
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL(/dashboard/);
});
