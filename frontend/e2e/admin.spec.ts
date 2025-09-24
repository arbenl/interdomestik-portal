import { test, expect } from '@playwright/test';

test('Admin Login and Panel Access', async ({ page }) => {
  await page.goto('/signin');
  await page.getByLabel(/email/i).fill('admin@example.com');
  await page.getByLabel(/password/i).fill('Passw0rd!');
  await page.getByRole('button', { name: /sign in/i }).click();

  await expect(page).toHaveURL(/\/profile$/);

  await page.goto('/admin');
  const heading = page.locator('h2', { hasText: /Admin Panel/i });
  await expect(heading).toBeVisible();
});
