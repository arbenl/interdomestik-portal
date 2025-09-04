Developer Progress Log

Last updated: 2025-09-04

Summary of changes completed
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
