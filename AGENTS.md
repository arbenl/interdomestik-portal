# Contributor Guide

See also: `docs/PROJECT_GUIDE.md` for detailed architecture and end-to-end context.

## Repository Map
- `frontend/`: React + TypeScript (Vite, Tailwind). Source in `frontend/src`, tests in `frontend/src/**/*.test.ts*`, assets in `frontend/public`. E2E in `frontend/e2e`, config at `frontend/playwright.config.ts`.
- `functions/`: Firebase Cloud Functions (TypeScript). Source in `functions/src`, compiled to `functions/lib`, tests under `functions/test`.
- `rules/`: Firestore security rules tests (Vitest).
- Root config: `firebase.json`, `firestore.rules`, `firestore.indexes.json`, `tsconfig.json`, `docs/`.
- CI: GitHub Actions workflows are included (`ci.yml`, `ci-light.yml`, `firebase.yml`).

## Tooling & Versions
- Package manager: `pnpm`
- Node: Functions target Node 20 (use an LTS locally)
- Firebase emulators (defaults): Hosting 5000, Functions 5001, Firestore 8080, Auth 9099

## Local Development
- Start emulators: `pnpm dev:emu` (root)
- Start frontend (Vite): `pnpm --filter frontend dev`
- Build frontend: `pnpm --filter frontend build`
- Seed demo data (emulator only):
  - `curl -X POST http://localhost:5001/demo-interdomestik/europe-west1/seedDatabase`

Test accounts after seeding: `member1@example.com`, `member2@example.com`, `admin@example.com`, `agent1@example.com`, `agent2@example.com`, `agent3@example.com` (password for all: `password123`).

## Build, Test, Deploy
- Frontend unit tests: `pnpm --filter frontend test`
- Lint: `pnpm --filter frontend lint`
- Functions build: `pnpm --filter functions build`
- Functions tests (emulators): `pnpm --filter functions test`
- Rules tests: `pnpm test:rules`
- E2E (Playwright): `pnpm --filter frontend e2e`
- Deploy all: `pnpm dlx firebase-tools deploy` — or per target via Firebase CLI

## Coding Standards
- TypeScript strict mode across packages
- Style: 2 spaces; semicolons required; prefer single quotes
- React:
  - Components in `frontend/src/components` use `PascalCase`
  - Hooks in `frontend/src/hooks` use `useX` naming and include unit tests where meaningful
  - Avoid conditional hook calls; keep components pure and predictable
- Functions:
  - Filenames `camelCase.ts` (e.g., `startMembership.ts`)
  - Keep thin function wrappers in `index.ts`; move business logic to `functions/src/lib/`
  - Fixed region: `europe-west1`

## Security & Configuration
- Emulator‑first workflow; never use production credentials locally
- Do not commit secrets. Prefer Firebase env config for sensitive values
- Auth roles via custom claims: `role` and `allowedRegions`
- CSP headers are set in `firebase.json`; avoid adding third‑party scripts outside the allowlist

## Data Model (summary)
- `members/{uid}`: profile fields, `memberNo`, `region`, `status`, `expiresAt`, timestamps
- `members/{uid}/memberships/{year}`: `status`, `startedAt`, `expiresAt`, `price`, `currency`, `paymentMethod`, `externalRef`
- `events/{autoId}`: `title`, `startAt`, `location`, `createdAt`
- `billing/{uid}/invoices/{invoiceId}`: `invoiceId`, `amount` (cents), `currency`, `status`, `created`
- Uniqueness: `registry/memberNo/{memberNo}` and `registry/email/{emailLower}` → `{ uid }`

## Functions (high‑level)
- HTTPS callables: `upsertProfile`, `startMembership`, `setUserRole`, `searchUserByEmail`, `agentCreateMember`
- HTTPS: `verifyMembership`, `clearDatabase`, `exportMembersCsv`, `stripeWebhook` (emulator‑friendly placeholder)
- Scheduled: `dailyRenewalReminders` (03:00 UTC)
- Emulator‑only: `seedDatabase` to create demo users, memberships, and `events`

## Testing Strategy
- Unit (Vitest): hooks (`useMemberProfile`, `useMembershipHistory`, etc.) and pure components
- Integration (Mocha): Cloud Functions against emulators (`stripeWebhook`, `verifyMembership`, core callables)
- Rules (Vitest): reads/writes for `members`, `memberships`, `events`, `billing`
- E2E (Playwright): sign in seeded user → portal cards render → billing adds a paid invoice via webhook

## PR & Commit Guidelines
- Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`, etc. (present tense)
- PRs: describe changes, link issues, add screenshots for UI, and include emulator/testing steps
- Required checks: frontend tests, functions tests, rules tests, and E2E for affected areas

### Spec Kit CI
- Feature branches should follow `NNN-short-name` and include a spec at `specs/NNN-short-name/spec.md`.
- CI enforces that the spec file exists and contains no `[NEEDS CLARIFICATION]` markers.
- Add the spec path to the PR body to help reviewers.

## Quick Reference
- Project id (emulators): `demo-interdomestik`
- Webhook (emulator): `http://localhost:5001/demo-interdomestik/europe-west1/stripeWebhook` (or `/stripeWebhook` via Hosting emulator)

## Docs Conventions
- Backlog: `docs/NEXT_TASKS.md` is the single source of truth for upcoming work.
- Runbooks: `docs/runbooks.md` (split per-topic under `docs/runbooks/` if needed); keep current.
- Session notes: `docs/notes/sessions/` (chronological, short, with follow-ups linked in NEXT_TASKS).
- State snapshots: latest 1–2 under `docs/snapshots/`; older ones in `docs/archive/`.
