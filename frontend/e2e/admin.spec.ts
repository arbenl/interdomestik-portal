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

test('Admin can trigger a new export', async ({ page, request }) => {
  const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID || 'interdomestik-dev';

  // Clear any existing export jobs to avoid concurrency guards keeping the button disabled.
  await request.delete(
    `http://${firestoreHost}/emulator/v1/projects/${projectId}/databases/(default)/documents/exports`
  );

  await page.goto('/signin');
  await page.getByLabel(/email/i).fill('admin@example.com');
  await page.getByLabel(/password/i).fill('Passw0rd!');
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL(/.*profile/);

  await page.goto('/admin');
  const panel = page.getByTestId('exports-panel');
  await expect(panel).toBeVisible({ timeout: 10000 });
  await panel.scrollIntoViewIfNeeded();

  const startBtn = panel.getByRole('button', {
    name: /Start Members CSV Export/i,
  });
  await expect(startBtn).toBeEnabled();
  await startBtn.click();

  // Wait until the empty state disappears and a new export row shows up.
  await expect(panel.getByText(/No exports found/i)).toBeHidden({
    timeout: 10000,
  });
  await expect(panel.getByRole('cell', { name: /members_csv/i })).toBeVisible({
    timeout: 10000,
  });
});
