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
  - HTTPS endpoints: `verifyMembership`, `exportMembersCsv`, `clearDatabase`, `stripeWebhook`
  - Scheduled: `dailyRenewalReminders` (03:00 UTC)
  - Emulator‑only: `seedDatabase` to create demo users, memberships, and events

## Repository Structure
- `frontend/`: React app (Vite).
  - Source: `frontend/src`
  - Tests: `frontend/src/**/*.test.ts*`
  - Assets: `frontend/public`
- `functions/`: Cloud Functions (TypeScript).
  - Source: `functions/src`
  - Build: `functions/lib`
  - Tests: `functions/test`
- `cypress/`: E2E tests and support; config in `cypress.config.ts`
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
npm install
(cd functions && npm install)
(cd frontend && npm install)
```
2) Start emulators (Functions, Firestore, Hosting, Auth)
```
cd functions && npm run serve
```
3) Start frontend dev server (optional; Hosting emulator also serves built app)
```
cd frontend && npm run dev
```
4) (Optional) Seed demo data (emulators only)
```
curl -X POST http://localhost:5001/demo-interdomestik/europe-west1/seedDatabase
```
Creates demo users (`member1@example.com`, `member2@example.com`, `admin@example.com`) with password `password123`, plus events and membership docs.

## Routing (SPA)
- `/signin`, `/signup`
- `/portal` (member dashboard with digital card, activity, events, billing link)
- `/billing` (invoices & payments)
- `/profile` (edit profile)
- `/membership` (membership history)
- `/admin` (admin tools), `/agent` (agent tools)
- `/verify` (public membership check)

## Commands
- Frontend: `npm run dev` | `npm run build` | `npm test`
- Functions: `npm run build` | `npm test` | `npm run serve` | `npm run deploy`
- Root: `npm test` (rules), `npm run cypress:open` | `npm run cypress:run`, `npm run deploy`

## Quick Reference
- Project id (emulators): `demo-interdomestik`
- Emulator ports: Hosting 5000, Functions 5001, Firestore 8085, Auth 9099
- Webhook (emulator): `http://localhost:5001/demo-interdomestik/europe-west1/stripeWebhook` (also via Hosting rewrite at `/stripeWebhook`)

## Testing
- Unit (frontend): Vitest + jsdom — colocate as `*.test.ts(x)` near code
- Integration (functions): Mocha + Chai using emulators
- Rules: `@firebase/rules-unit-testing` under `test/`
- E2E: Cypress; baseUrl `http://localhost:5000` (Hosting emulator)

## Functions Reference
- `verifyMembership` (HTTPS): GET with `memberNo` → `{ valid, name, region }`
- `stripeWebhook` (HTTPS): emulator‑friendly placeholder; expects `{ uid, invoiceId?, amount, currency, created? }`; writes `billing/{uid}/invoices/{invoiceId}` with `status: 'paid'`. Hosting rewrite available at `/stripeWebhook`.
- `exportMembersCsv` (HTTPS): CSV export of basic member info
- `clearDatabase` (HTTPS): development utility to purge Auth users and member docs
- Callables: `upsertProfile`, `startMembership`, `setUserRole`, `searchUserByEmail`, `agentCreateMember`
- `dailyRenewalReminders` (scheduled): sends reminder emails for 30/7/1‑day windows
- `seedDatabase` (HTTPS, emulator only): creates demo users, memberships, and events

## Security Model
- Auth with custom claims (`role`, `allowedRegions`) governs admin/agent permissions
- Firestore rules (high‑level expectations):
  - Members may read their own profile and memberships; writes are restricted
  - Admins may read/write member profiles in allowed regions
  - `events` readable by authenticated users; writes limited to admins
  - `billing/{uid}/invoices` readable by the owner and admins; writes by backend only

## Performance & Observability
- Functions sized for pay‑per‑use; no minimum instances
- Logging kept minimal; enable deeper tracing only when debugging
- Avoid heavy listeners on the client; prefer paginated reads and ordered queries

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
  http://localhost:5001/demo-interdomestik/europe-west1/stripeWebhook
```

## Email
- Prefer Firebase Trigger Email extension via SMTP (Brevo/SendGrid/SES)
- Queue docs to `mail` collection; templates: Welcome/Activated, Receipt, Renewal Reminders
- Include org address and support email (configurable); comply with local regulations

## Known Gaps / Next Steps
- Finalize Firestore rules for `events` and `billing` per above expectations
- Secrets hygiene: document rotation and signed‑webhook tests in staging
- Expand test coverage and wire CI (see testing plan)
