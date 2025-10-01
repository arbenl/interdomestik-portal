const DEFAULT_PROJECT_ID = 'interdomestik-dev';
const FUNCTIONS_HOST =
  process.env.FUNCTIONS_EMULATOR_ORIGIN || 'http://127.0.0.1:5001';
const PROJECT_ID =
  process.env.FIREBASE_PROJECT_ID ||
  process.env.GCLOUD_PROJECT ||
  DEFAULT_PROJECT_ID;

async function main() {
  const base = FUNCTIONS_HOST.replace(/\/$/, '');
  const seedUrl = `${base}/${PROJECT_ID}/europe-west1/seedDatabase`;
  console.log(`🌱 Seeding via callable: ${seedUrl}`);
  const res = await fetch(seedUrl, {
    headers: { 'x-emulator-admin': 'true' },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Seed failed (${res.status}): ${text}`);
  }
  console.log(text || '✅ Seed complete.');
}

main().catch((err) => {
  console.error('🔴 Seeder error:', err);
  process.exit(1);
});
