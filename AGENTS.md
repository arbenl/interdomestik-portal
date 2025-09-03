# Repository Guidelines

## Project Structure & Module Organization
- `frontend/`: React + TypeScript app (Vite, Tailwind). Source in `frontend/src`, unit tests in `frontend/src/**/*.test.ts*`, assets in `frontend/public`.
- `functions/`: Firebase Cloud Functions (TypeScript). Source in `functions/src`, compiled JS in `functions/lib`, tests in `functions/test`.
- `cypress/`: E2E tests and support utilities; config in `cypress.config.ts`.
- `test/`: Firestore security rules tests for the project.
- Root config: `firebase.json`, `firestore.rules`, `firestore.indexes.json`, `tsconfig.json`, `.github/` workflows, `docs/`.

## Build, Test, and Development Commands
- Local emulators: `cd functions && npm run serve` (functions, Firestore, Hosting, Auth emulators).
- Frontend dev: `cd frontend && npm run dev` (Vite dev server).
- Frontend build: `cd frontend && npm run build` (TypeScript build + Vite bundle).
- Frontend unit tests: `cd frontend && npm test` (Vitest + jsdom).
- Functions build: `cd functions && npm run build` (tsc to `lib/`).
- Functions unit/integration tests: `cd functions && npm test` (Mocha; uses emulators).
- Rules tests: `npm test` (Mocha tests under `test/`).
- E2E: `npm run cypress:open` or `npm run cypress:run` (baseUrl defaults to `http://localhost:5000`).
- Deploy: `npm run deploy` (root) or `cd functions && npm run deploy`.

## Coding Style & Naming Conventions
- TypeScript strict mode across packages.
- Indentation: 2 spaces; semicolons required; prefer single quotes.
- React: Components `PascalCase`, hooks `useX` in `frontend/src/hooks/`.
- Functions: file names `camelCase.ts` (e.g., `startMembership.ts`).
- Linting: `cd frontend && npm run lint` (ESLint flat config). Root lint placeholder for now.

## Testing Guidelines
- Frameworks: Vitest (frontend), Mocha + Firebase emulators (functions, rules), Cypress (E2E).
- Naming: `*.test.ts` or `*.test.tsx`. Place close to code (frontend) or under `functions/test`.
- Coverage: keep or improve; add tests for new hooks, utils, and function handlers.
- Emulators: tests assume local emulators; avoid real project credentials.

## Commit & Pull Request Guidelines
- Commit style follows Conventional Commits seen in history (e.g., `feat:`, `fix:`, `chore:`). Use imperative, present tense.
- PRs: clear description, link issues, include screenshots for UI changes, and note emulator/testing steps.
- Checks: run `frontend` unit tests, `functions` tests, rules tests, and E2E (if affected) before requesting review.

## Security & Configuration Tips
- Use emulators for local work; never commit secrets.
- For Cypress tasks, you can override project via `FB_PROJECT_ID`; defaults to `demo-interdomestik`.
