// e2e/global-setup.ts (ESM-safe, idempotent seeding)
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { promises as fs } from 'node:fs';

// Resolve __dirname in ESM
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const API_KEY = process.env.VITE_FIREBASE_API_KEY || 'demo-key';
const PROJECT_ID =
  process.env.VITE_FIREBASE_PROJECT_ID ||
  process.env.FIREBASE_PROJECT_ID ||
  process.env.GCLOUD_PROJECT ||
  'interdomestik-dev';
const useEmulators = ['1', 'true', 'TRUE'].includes(
  String(process.env.VITE_USE_EMULATORS ?? '').trim()
);
const authHostFromEnv = process.env.FIREBASE_AUTH_EMULATOR_HOST;
const authHost =
  authHostFromEnv ||
  (useEmulators
    ? `${process.env.VITE_EMU_AUTH_HOST ?? '127.0.0.1'}:${process.env.VITE_EMU_AUTH_PORT ?? '9099'}`
    : '');

const BASE = authHost
  ? `http://${authHost}/identitytoolkit.googleapis.com/v1`
  : 'https://identitytoolkit.googleapis.com/v1';

// --- tiny REST helpers -------------------------------------------------------
async function jsonFetch<T>(url: string, init: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    // Useful console for CI
    console.error('REST error', res.status, body);
    throw Object.assign(
      new Error(body?.error?.message || `HTTP ${res.status}`),
      { status: res.status, body }
    );
  }
  return body as T;
}

type AuthReply = { localId: string; idToken: string };

// Try signUp; if EMAIL_EXISTS, signIn instead.
async function signUpOrIn(email: string, password: string): Promise<AuthReply> {
  try {
    return await jsonFetch<AuthReply>(
      `${BASE}/accounts:signUp?key=${API_KEY}`,
      {
        method: 'POST',
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      }
    );
  } catch (e: unknown) {
    if (
      e instanceof Error &&
      (e as { body?: { error?: { message?: string } } }).body?.error
        ?.message === 'EMAIL_EXISTS'
    ) {
      return await jsonFetch<AuthReply>(
        `${BASE}/accounts:signInWithPassword?key=${API_KEY}`,
        {
          method: 'POST',
          body: JSON.stringify({ email, password, returnSecureToken: true }),
        }
      );
    }
    throw e;
  }
}

async function setClaims(localId: string, claims: Record<string, unknown>) {
  const payload = { localId, customAttributes: JSON.stringify(claims) };

  if (authHost) {
    await jsonFetch(`${BASE}/projects/${PROJECT_ID}/accounts:update`, {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { Authorization: 'Bearer owner' },
    });
    return;
  }

  await jsonFetch(`${BASE}/accounts:update?key=${API_KEY}`, {
    method: 'POST',
    body: JSON.stringify({ ...payload, targetProjectId: PROJECT_ID }),
  });
}

// --- Playwright global setup -------------------------------------------------
export default async function globalSetup() {
  // Seed normal user
  const user = await signUpOrIn('e2e.user@example.com', 'secret123!');
  await setClaims(user.localId, { role: 'member' });

  // Seed admin user
  const admin = await signUpOrIn('admin@example.com', 'Passw0rd!');
  await setClaims(admin.localId, { role: 'admin' });

  // Optional: write a placeholder/state dir for consistency
  const out = path.resolve(__dirname, './.auth/.seeded');
  await fs.mkdir(path.dirname(out), { recursive: true });
  await fs.writeFile(out, new Date().toISOString());
}
