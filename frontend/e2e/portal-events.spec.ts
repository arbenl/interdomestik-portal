import { test, expect } from '@playwright/test';

const FIRESTORE_BASE =
  process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
const PROJECT_ID =
  process.env.VITE_FIREBASE_PROJECT_ID || 'interdomestik-dev';

async function seedEvent(request: any, event: {
  id: string;
  title: string;
  startAt: string;
  location: string;
  focus: string;
  tags: string[];
  regions: string[];
}) {
  await request.post(
    `http://${FIRESTORE_BASE}/v1/projects/${PROJECT_ID}/databases/(default)/documents/events?documentId=${event.id}`,
    {
      data: {
        fields: {
          title: { stringValue: event.title },
          startAt: { timestampValue: event.startAt },
          location: { stringValue: event.location },
          focus: { stringValue: event.focus },
          tags: {
            arrayValue: {
              values: event.tags.map((tag) => ({ stringValue: tag })),
            },
          },
          regions: {
            arrayValue: {
              values: event.regions.map((region) => ({ stringValue: region })),
            },
          },
        },
      },
    }
  );
}

test('member can filter portal events', async ({ page, request }) => {
  await request.delete(
    `http://${FIRESTORE_BASE}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents/events`
  );

  const events = [
    {
      id: 'summit-eu',
      title: 'Quarterly Member Summit',
      startAt: '2025-10-12T00:00:00.000Z',
      location: 'Madrid, ES',
      focus: 'Regional policy updates • Partner showcase',
      tags: ['conference'],
      regions: ['IBERIA'],
    },
    {
      id: 'webinar-renewals',
      title: 'Retention Playbook Workshop',
      startAt: '2025-11-02T00:00:00.000Z',
      location: 'Virtual',
      focus: 'Renewal automations • Outreach cadences',
      tags: ['workshop', 'virtual'],
      regions: ['REMOTE'],
    },
    {
      id: 'meetup-nl',
      title: 'Benelux Member Meetup',
      startAt: '2025-11-18T00:00:00.000Z',
      location: 'Amsterdam, NL',
      focus: 'Cross-border billing • Member spotlights',
      tags: ['meetup'],
      regions: ['BENELUX'],
    },
    {
      id: 'workshop-uk',
      title: 'UK Compliance Workshop',
      startAt: '2025-09-30T00:00:00.000Z',
      location: 'London, UK',
      focus: 'Post-Brexit requirements • Support playbooks',
      tags: ['workshop'],
      regions: ['UK'],
    },
  ];

  for (const event of events) {
    await seedEvent(request, event);
  }

  await page.goto('/signin');
  await page.getByLabel(/email/i).fill('e2e.user@example.com');
  await page.getByLabel(/password/i).fill('secret123!');
  await page.getByRole('button', { name: /sign in/i }).click();

  await expect(page.getByRole('heading', { name: /My Profile/i })).toBeVisible();

  await page.goto('/portal/events');

  await expect(
    page.getByRole('heading', { name: /Upcoming events/i })
  ).toBeVisible();

  const eventsSection = page.locator('[aria-labelledby="events-heading"]');
  const eventItems = eventsSection.locator('li');

  await expect(eventItems).toHaveCount(4);
  await expect(page.getByText('Quarterly Member Summit')).toBeVisible();

  await page.getByRole('button', { name: /Workshops/i }).click();

  await expect(eventItems).toHaveCount(2);
  await expect(
    eventsSection.locator('li', { hasText: 'Retention Playbook Workshop' })
  ).toBeVisible();
  await expect(
    eventsSection.locator('li', { hasText: 'UK Compliance Workshop' })
  ).toBeVisible();
  await expect(
    eventsSection.locator('li', { hasText: 'Quarterly Member Summit' })
  ).toHaveCount(0);
});
