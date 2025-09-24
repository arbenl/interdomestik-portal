# Interdomestik Member Portal — Project Guide

## Overview
Interdomestik Member Portal is a cost‑optimized, secure portal built on Firebase. The frontend is React + TypeScript (Vite, Tailwind). The backend uses Firebase Cloud Functions (Node 20) with Firestore (EU region) and Firebase Auth (custom claims for RBAC).

Primary personas: Members, Agents, and Admins. Core capabilities include profile management, membership activation and renewals, a member portal with a digital card, events visibility, and basic billing records.

## Architecture
- Hosting: Firebase Hosting + CDN (SPA served with React Router)
- Auth: Firebase Authentication (email/password, custom claims)
- Data: Firestore collections: `members/{uid}`, `members/{uid}/memberships`, `events`, `billing/{uid}/invoices`, and `registry/*`
- Functions (region `europe-west1`):
  - HTTPS callables: `upsertProfile`, `startMembership`, `setUserRole`, `searchUserByEmail`, `agentCreateMember`
  - HTTPS endpoints: `verifyMembership`, `clearDatabase`, `stripeWebhook`
  - Exports (v2): callable `startMembersExport` + Firestore `onCreate` worker (`exportsWorkerOnCreate`)
  - Scheduled: `dailyRenewalReminders` (03:00 UTC)
  - Emulator‑only: `seedDatabase` to create demo users, memberships, and events
- **New:** The frontend architecture has been refactored to be modular and performant.
  - **Admin & Portal Pages:** The UI is split into feature-based panels (e.g., `OrganizationsPanel`, `ProfilePanel`).
  - **Data Fetching:** TanStack Query is used for data fetching, caching, and server state management.
  - **Code Splitting:** Feature panels are lazily loaded using `React.lazy` and `<Suspense>`.

## Repository Structure
- `frontend/`: React app (Vite).
  - Source: `frontend/src`
    - `features/`: Contains the modular features for the Admin and Portal pages.
    - `services/`: Contains typed wrappers for Firebase services.
    - `utils/`: Contains shared utility functions.
  - Tests: `frontend/src/**/*.test.ts*`
  - Assets: `frontend/public`
- `functions/`: Cloud Functions (TypeScript).
  - Source: `functions/src`
  - Build: `functions/lib`
  - Tests: `functions/test`
- E2E: Playwright tests live under `frontend/e2e`; config in `frontend/playwright.config.ts`
- `test/`: Firestore security rules tests
- Root configs: `firebase.json`, `firestore.rules`, `firestore.indexes.json`, `tsconfig.json`, `docs/`

## Data Model
- `members/{uid}`
  - email (lowercased), name, region (code), phone?, orgId?
  - memberNo (unique), agentId?
  - activeMembership (summary), status (`active`|`expired`|`none`)
  - year (number|null), expiresAt (timestamp|null)
  - createdAt, updatedAt
- `members/{uid}/memberships/{year}`
  - status, startedAt, expiresAt
  - price, currency (`EUR`), paymentMethod (`cash`|`card`|`bank`|`other`)
  - externalRef?, updatedAt
- `events/{autoId}`
  - title (string), startAt (timestamp), location (string), createdAt (timestamp)
- `billing/{uid}/invoices/{invoiceId}`
  - invoiceId (string), amount (number, cents), currency (string)
  - status (`paid`|`open`|`void`|...)
  - created (timestamp)
- Uniqueness registry: `registry/memberNo/{memberNo}` and `registry/email/{emailLower}` → `{ uid }`

## Local Development
1) Install dependencies
```
pnpm install
```
2) Start emulators (Functions, Firestore, Hosting, Auth)
```
pnpm dev:emu
```
3) Start frontend (Vite)
```
pnpm --filter frontend dev
```
4) (Optional) Seed demo data (emulators only)
```
curl -X POST http://localhost:5001/<project-id>/europe-west1/seedDatabase
```
Creates demo users (`member1@example.com`, `member2@example.com`, `admin@example.com`) with password `password123`, plus events and membership docs.

## Routing (SPA)
- `/signin`, `/signup`
- `/portal`: Member portal with a shared layout (`PortalLayout`).
  - `/portal/profile`
  - `/portal/membership`
  - `/portal/claims`
  - `/portal/payments`
  - `/portal/documents`
  - `/portal/support`
- `/admin`: Admin tools, with lazily loaded feature panels.
- `/agent`: Agent tools.
- `/verify`: Public membership check.

## Commands
- `pnpm dev`: Starts the development server for the frontend.
- `pnpm build`: Builds the frontend for production.
- `pnpm test`: Runs all tests (frontend, functions, rules).
- `pnpm lint`: Lints the frontend and functions code.
- `pnpm dev:all`: Starts the Firebase emulators and the frontend development server.

## Quick Reference
- Project id (emulators): defaults to `interdomestik-dev` (override with `VITE_FIREBASE_EMULATOR_PROJECT_ID` if you start emulators with a different project).
- Emulator ports: Hosting 5000, Functions 5001, Firestore 8080, Auth 9099
- Webhook (emulator): `http://localhost:5001/<project-id>/europe-west1/stripeWebhook` (also via Hosting rewrite at `/stripeWebhook`)

## Testing
- Unit (frontend): Vitest + jsdom — colocate as `*.test.ts(x)` near code.
- Integration (functions): Mocha + Chai using emulators.
- Rules: Vitest + `@firebase/rules-unit-testing` in `rules/__tests__`.
- E2E: Playwright (`pnpm --filter frontend e2e`); Playwright spawns the Vite dev server.
- When testing components that use TanStack Query, wrap in `QueryClientProvider`.

## Functions Reference
- `verifyMembership` (HTTPS): GET with `memberNo` → `{ valid, name, region }`
- `stripeWebhook` (HTTPS): emulator‑friendly placeholder; expects `{ uid, invoiceId?, amount, currency, created? }`; writes `billing/{uid}/invoices/{invoiceId}` with `status: 'paid'`. Hosting rewrite available at `/stripeWebhook`.
- Exports v2:
  - `startMembersExport` (callable): enqueue an export job at `exports/{id}` with `filters`, `columns` (preset `BASIC|FULL`), and `createdBy`.
  - `exportsWorkerOnCreate` (Firestore onCreate): streams filtered member rows to GCS as CSV, updates `progress.rows/bytes`, and attaches a 3‑day signed URL when available.
- `clearDatabase` (HTTPS): development utility to purge Auth users and member docs
- Callables: `upsertProfile`, `startMembership`, `setUserRole`, `searchUserByEmail`, `agentCreateMember`
- `dailyRenewalReminders` (scheduled): sends reminder emails for 30/7/1‑day windows
- `seedDatabase` (HTTPS, emulator only): creates demo users, memberships, and events.
  - When you start the emulators with a non-default project id, update the seed URL to match, e.g. `curl -X POST http://localhost:5001/<your-project-id>/europe-west1/seedDatabase`.

## Security Model
- Auth with custom claims (`role`, `allowedRegions`) governs admin/agent permissions
- Firestore rules (high‑level expectations):
  - Members may read their own profile and memberships; writes are restricted
  - Admins may read/write member profiles in allowed regions
  - `events` readable by authenticated users; writes limited to admins
  - `billing/{uid}/invoices` readable by the owner and admins; writes by backend only

## Performance & Observability
- **New:** The frontend is optimized for performance using code-splitting (`React.lazy` and `<Suspense>`) and a robust data fetching layer with TanStack Query.
- **New:** A bundle analysis can be generated by running `pnpm run build`. The report is saved as `stats.html`.
- Functions sized for pay‑per‑use; no minimum instances
- Logging kept minimal; enable deeper tracing only when debugging

## Deployment
- All: `firebase deploy`
- Only functions: `firebase deploy --only functions`
- Only hosting: `firebase deploy --only hosting`

## Payments
- MVP: Admin‑activated memberships with `paymentMethod` and optional `externalRef`.
- Billing page displays `billing/{uid}/invoices` and can simulate a paid invoice via `stripeWebhook` in emulator.
- Production: Stripe signature verification + idempotency implemented.
  - Expect `invoice.payment_succeeded` with `metadata.uid` set to the Firebase UID.
  - Webhook uses `STRIPE_SIGNING_SECRET` and `STRIPE_API_KEY` when present; otherwise falls back to emulator JSON body.
  - Duplicate events are ignored via `webhooks_stripe/{event.id}`.

Production setup:
```
firebase functions:secrets:set STRIPE_SIGNING_SECRET
firebase functions:secrets:set STRIPE_API_KEY
firebase deploy --only functions
```

Local webhook example (no signature):
```
curl -X POST \
  -H 'Content-Type: application/json' \
  -d '{"uid":"<UID>","invoiceId":"inv_test_1","amount":2500,"currency":"EUR"}' \
  http://localhost:5001/interdomestik-dev/europe-west1/stripeWebhook
```

## Email
- Prefer Firebase Trigger Email extension via SMTP (Brevo/SendGrid/SES)
- Queue docs to `mail` collection; templates: Welcome/Activated, Receipt, Renewal Reminders
- Include org address and support email (configurable); comply with local regulations

## Known Gaps / Next Steps
- Finalize Firestore rules for `events` and `billing` per above expectations
- Secrets hygiene: document rotation and signed‑webhook tests in staging
- Expand test coverage and wire CI (see testing plan)

## Operations

- TTL & Cleanup: Use Firestore TTL for `audit_logs.ttlAt` and `metrics.ttlAt`. Scheduled `cleanupExpiredData` deletes expired docs daily at 03:15 UTC. In production, enable TTL in the console for those fields to enforce retention.

- Idempotency: Membership activations (manual, admin, webhook) are idempotent using a `{uid, year, source}` key. Webhook events use a `webhooks_stripe/{event.id}` guard to ignore duplicates.

- Exports (v2): Admins enqueue jobs via `startMembersExport`. A Firestore onCreate worker streams CSV to Cloud Storage, updates `progress`, and adds a 3‑day signed URL. Storage rules restrict `/exports/**` reads to admins; writes occur via Admin SDK only.
