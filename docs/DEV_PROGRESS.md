Developer Progress Log

Last updated: 2025-09-10

Summary of changes completed
- Phase 1/2 features
  - Payments UI: Added Payment Element scaffold and completed createPaymentIntent callable (metadata.uid attached).
  - Webhook → startMembership: Idempotent mapping; now also sends membership card + receipt emails.
  - Renewal UX: Added portal CTA, success badge, Billing toasts, and “Resend card” action.
  - Signed QR tokens: HS256 tokens (mno, exp, kid, jti) + token-based verify endpoint and email links.
  - Token helpers: Revocation check in verify; admin callables to revoke token and show key status; multi-key support via env.
- Admin & agent
  - Agents restricted to own members (rules + UI); Agent Tools list with inline safe-field edits.
  - Admin list: status chips, status filter, “expiring in 30 days” filter, selection + “Renew selected” bulk action, per-row quick renew.
- Reports
  - Monthly aggregator (scheduled) writing to /reports; CSV export endpoint; Admin Reports panel with generate (emulator) and simple region chart.
- Seed & DX
  - Seed expanded: 3 agents + 60 members across regions with mixed active/expired states.
  - Docs refactor: centralized docs, archived old plans, NEXT_TASKS as single backlog.
- Tests and emulators
  - Rules tests now run via `firebase emulators:exec` and pass.
- Firestore emulator port set to 8085 to avoid conflicts; rules tests, functions tests, and Cypress read from `FIRESTORE_EMULATOR_HOST` when provided.
  - CSP updated to allow emulator ports (8085) in connect-src.
- Frontend performance and stability
  - Route-level code splitting: pages are loaded with `React.lazy` + `Suspense`.
  - Firestore persistent cache enabled; Auth uses IndexedDB persistence via `initializeAuth`.
  - Emulator host/ports in `frontend/src/firebase.ts` read from Vite env with sensible defaults.
- Navbar fixes
  - Dropdown links converted to `<Link>` components to avoid full reloads.
  - Proper sign-out implemented (`signOut(auth)` then navigate to `/signin`).
  - Added a visible `Billing` link in the main nav.
- Agent flow
  - `useUsers` accepts `allowedRegions` and applies a region filter (and a limit) to align with rules.
  - `Admin.tsx` passes `allowedRegions` to `useUsers`.
  - `RegionSelect` can receive a limited set of options; `AgentRegistrationCard` constrains selectable regions to `allowedRegions`.
  - `useAgentOrAdmin` forces a token refresh once to pick up custom claims locally.
- QR code reliability
  - `SimpleQr` now falls back to `api.qrserver.com` on load failure and uses `no-referrer` policy.
  - CSP `img-src` updated to include the fallback domain.
- CI and quality
  - Root `lint` script runs frontend + functions linters.
  - Added GitHub Actions workflow with jobs for lint, frontend unit, functions unit (with emulators), rules, and E2E (Cypress with emulators + hosting).

Notable follow-ups (proposed)
- Stabilize tests: admin_activate and admin_bulk_renew E2E are currently failing/flaky; selectors updated, re-run pending.
- Finish Payment Element in prod: set Stripe keys and mark Phase 1 UI as done.
- NameLower backfill: run to completion and record final stats in admin_jobs.
- Token rotation: add admin UI to display/rotate active kid; optional jti revoke UI.
- Reports: optional charts and storage-based async CSV with email link.
- Coverage: Add `vitest --coverage` for frontend and `c8`/`nyc` for functions; publish artifacts in CI.
- Pre-commit: Add `husky` + `lint-staged` for lint/typecheck on staged files.
- Bundle analysis: Add `vite-bundle-visualizer` and an `analyze` script.
- Firebase Performance Monitoring: Integrate in production build and update CSP.
- Emulator config unification: functions tests now default to `localhost:8085` (aligned with `firebase.json`). Future improvement: derive entirely from env.
- QR download: Make the “Download QR” button use the same resolved image URL or generate a local data URL to eliminate external dependence.

How to run
- Rules tests: `npm test` at repo root.
- Frontend tests: `cd frontend && npm test`.
- Functions tests: `cd functions && npm test` (automatically runs under Firestore/Auth emulators via `emulators:exec`).
- E2E: `npm run cypress:run` (emulators + hosting recommended: `cd functions && npm run serve`).
  - Focus failing specs: `--spec cypress/e2e/admin_activate.cy.ts,cypress/e2e/admin_bulk_renew.cy.ts`
