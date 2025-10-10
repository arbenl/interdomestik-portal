import { test, expect } from '@playwright/test';

test('admin can acknowledge automation alerts', async ({ page, request }) => {
  page.on('console', (msg) => {
    console.log('[browser]', msg.type(), msg.text());
  });
  const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID || 'interdomestik-dev';

  const baseName = `projects/${projectId}/databases/(default)/documents`;
  const alertDocPath = `${baseName}/automationAlerts/e2e-alert`;
  const acknowledgmentDocPath = `${baseName}/alertAcknowledgements/e2e-alert`;

  const authHeader = { Authorization: 'Bearer owner' } as const;

  await request.delete(`http://${firestoreHost}/v1/${alertDocPath}`, {
    headers: authHeader,
  });
  await request.delete(`http://${firestoreHost}/v1/${acknowledgmentDocPath}`, {
    headers: authHeader,
  });

  const createResponse = await request.post(
    `http://${firestoreHost}/v1/${baseName}/automationAlerts?documentId=e2e-alert`,
    {
      data: {
        fields: {
          message: { stringValue: 'Webhook dispatch responded with 503' },
          severity: { stringValue: 'critical' },
          status: { stringValue: '503' },
          count: { integerValue: '4' },
          windowDays: { integerValue: '7' },
          actor: { stringValue: 'automation' },
          url: { stringValue: 'https://example.com/hooks/renewals' },
          createdAt: { timestampValue: new Date().toISOString() },
          acknowledged: { booleanValue: false },
        },
      },
      headers: authHeader,
    }
  );
  expect(createResponse.ok()).toBeTruthy();

  const alertResponse = await request.get(
    `http://${firestoreHost}/v1/${alertDocPath}`,
    { headers: authHeader }
  );
  expect(alertResponse.ok()).toBeTruthy();

  await page.goto('/signin');
  await page.getByLabel(/email/i).fill('admin@example.com');
  await page.getByLabel(/password/i).fill('Passw0rd!');
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/profile$/);

  await page.goto('/admin');
  const metricsPanel = page.getByRole('heading', {
    name: /Automation hooks/i,
  });
  await expect(metricsPanel).toBeVisible({ timeout: 10_000 });

  const alertList = page.getByTestId('alert-workflow-list');
  await expect(alertList).toBeVisible();

  const acknowledgeButton = alertList.getByRole('button', {
    name: /acknowledge/i,
  });
  await expect(acknowledgeButton).toBeEnabled();

  await acknowledgeButton.click();

  await expect(
    alertList.getByText(/Alert acknowledged/i)
  ).toBeVisible({ timeout: 10_000 });
  await expect(
    alertList.getByText(/Failed to acknowledge alert/i)
  ).toHaveCount(0);
});
