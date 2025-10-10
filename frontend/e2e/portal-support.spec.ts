import { test, expect } from '@playwright/test';

test('member can view the support page', async ({ page }) => {
  await page.goto('/signin');
  await page.getByLabel(/email/i).fill('e2e.user@example.com');
  await page.getByLabel(/password/i).fill('secret123!');
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL(/.*profile/);

  await page.getByRole('link', { name: /support/i }).click();

  await expect(page).toHaveURL(/.*support/);
  await expect(page.getByRole('heading', { name: /support center/i })).toBeVisible();

  await expect(
    page.getByRole('heading', { name: /frequently asked questions/i })
  ).toBeVisible();
  await expect(page.getByText(/how do i renew my membership/i)).toBeVisible();
});
