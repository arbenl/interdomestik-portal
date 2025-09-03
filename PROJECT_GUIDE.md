# Interdomestik Member Portal — Project Handbook

## Overview
A cost‑optimized, secure member portal built on Firebase. Frontend is React + TypeScript (Vite, Tailwind). Backend uses Firebase Cloud Functions (Node 20) with Firestore (EU) and Firebase Auth with custom claims for RBAC.

## Architecture
- Hosting: Firebase Hosting + CDN (SPA with React Router)
- Auth: Firebase Authentication (email/password, custom claims)
- Data: Firestore collections: `members/{uid}`, `members/{uid}/memberships`
- Functions (europe‑west1): `upsertProfile`, `startMembership`, `exportMembersCsv` (HTTPS), `verifyMembership` (HTTPS), `setUserRole`, scheduled expirations

## Project Structure
- `frontend/` React app (Vite). Source: `frontend/src`, tests: `frontend/src/**/*.test.ts*`, assets: `frontend/public`
- `functions/` Cloud Functions (TypeScript). Source: `functions/src`, build: `functions/lib`, tests: `functions/test`
- `cypress/` E2E tests and support. Config: `cypress.config.ts`
- `test/` Firestore security rules tests
- Root configs: `firebase.json`, `firestore.rules`, `firestore.indexes.json`, `tsconfig.json`, `docs/`

## Data Model
- `members/{uid}`: email (lowercased), name, region (code), phone?, orgId?, memberNo (unique, immutable), agentId?, activeMembership (summary), status (`active`|`expired`|`none`), year (number|null), expiresAt (timestamp|null), createdAt/updatedAt.
- `members/{uid}/memberships/{year}`: status, startedAt, expiresAt, price, currency (`EUR`), paymentMethod (`cash`|`card`|`bank`|`other`), externalRef?, updatedAt.
- Uniqueness registry: `registry/memberNo/{memberNo} → { uid }`, `registry/email/{emailLower} → { uid }`.
- Server-only fields: `memberNo`, `agentId`, `activeMembership`, `status`, `year`, `expiresAt` (client cannot edit).

## Local Development
1) Install deps
```
npm install
(cd functions && npm install)
(cd frontend && npm install)
```
2) Start emulators (functions, firestore, hosting, auth)
```
cd functions && npm run serve
```
3) Start frontend dev server
```
cd frontend && npm run dev
```
Base URL for E2E/tests: `http://localhost:5000` (Hosting emulator). Override Cypress project with `FB_PROJECT_ID` if needed.

## Commands
- Frontend: `npm run dev` | `npm run build` | `npm test`
- Functions: `npm run build` | `npm test` | `npm run serve` | `npm run deploy`
- Root: `npm test` (rules), `npm run cypress:open` | `npm run cypress:run`, `npm run deploy`

## Testing
- Unit (frontend): Vitest + jsdom — colocate as `*.test.ts(x)`
- Unit/Integration (functions): Mocha + Chai using emulators
- Rules: `@firebase/rules-unit-testing` under `test/`
- E2E: Cypress; helpers in `cypress/support/commands.ts` (auth/reset/claims)

## Agent Registration (Callable)
- Name: `agentCreateMember`
- Auth: agent or admin; agents restricted to `allowedRegions`
- Input: `{ email, name, region, phone?, orgId? }`
- Returns: `{ uid }`
- Example (web):
```
import { httpsCallable } from 'firebase/functions';
const agentCreateMember = httpsCallable(functions, 'agentCreateMember');
await agentCreateMember({ email: 'x@y.com', name: 'Full Name', region: 'PRISHTINA' });
```

## Routes & Screens
- `/signin`, `/signup`, `/profile` (digital membership card), `/membership` (history), `/admin` (admin tools), `/verify` (public membership check)

## Security & Cost
- Emulator‑first workflow; never commit secrets
- Custom claims for RBAC (e.g., `role`, `allowedRegions`)
- Gen2 functions, no min instances; sampled logs; avoid SMS auth

## Deployment
- All: `firebase deploy`
- Only functions: `firebase deploy --only functions`
- Only hosting: `firebase deploy --only hosting`

## References
- README highlights: features, security, runbooks in `docs/`
- GEMINI details: workflows, function list, E2E guidance

## Payments (Phased)
- MVP (now): admin-activated memberships with payment tracking.
  - Use Activate Membership modal: select `paymentMethod` (`cash`|`bank`|`card`|`other`), optional `externalRef` (bank txn id / Stripe id). A receipt email can be sent via Trigger Email.
- Phase 2: Stripe Payment Links.
  - Create a Payment Link per product/year in Stripe Dashboard and distribute per region/agent.
  - Best: add a Stripe webhook HTTP function to confirm payment and set membership active (store `externalRef = payment_intent id`).
  - Cheap fallback: member uploads receipt; admin activates membership manually.

## Email
- Provider: use Firebase Trigger Email extension with SMTP.
  - Good EU options: Brevo (Sendinblue), SendGrid, AWS SES.
- Implementation: queue docs to `mail` collection. MVP uses inline HTML helpers; can switch to provider templates later via `template: { name, data }`.
- Templates (MVP):
  - Welcome / Membership Activated: name, memberNo, expiry, Verify URL.
  - Payment Receipt: amount, method, externalRef.
  - Renewal Reminder (30/7/1 days): includes renew/contact link.
- Compliance: add org postal address and support email in footer (configured via env; defaults included).
