# Repository Guidelines

## Project Structure & Module Organization
- `frontend/`: React + TypeScript (Vite). Source in `frontend/src`; unit tests in `frontend/src/**/*.test.ts*`; assets in `frontend/public`; Playwright specs in `frontend/e2e`.
- `functions/`: Firebase Cloud Functions (Node 20). Keep wrappers in `functions/src/index.ts`, put logic in `functions/src/lib`, and cover behavior under `functions/test`.
- `rules/`: Firestore security rules covered by Vitest; commit rule updates with matching tests.
- Planning lives in `docs/`. Track work in `docs/NEXT_TASKS.md`; each feature branch owns `specs/NNN-short-name/spec.md` with no `[NEEDS CLARIFICATION]` tags.

## Build, Test, and Development Commands
- `pnpm dev:emu`: start Firebase emulators (Hosting 5000, Functions 5001, Firestore 8080, Auth 9099).
- `pnpm --filter frontend dev`: run the Vite dev server against emulator APIs.
- `pnpm --filter frontend build`: produce the production bundle and catch TypeScript errors.
- `pnpm --filter frontend test`: execute the Vitest suite.
- `pnpm --filter functions build` / `pnpm --filter functions test`: compile functions and run Mocha integration tests.
- `pnpm --filter frontend e2e`: launch Playwright; seed demo data first when using canned accounts.

## Coding Style & Naming Conventions
- TypeScript strict everywhere, 2-space indentation, required semicolons, single quotes.
- Components live in `frontend/src/components` with PascalCase names; hooks live in `frontend/src/hooks` as `useX` with colocated tests.
- Cloud Functions modules use `camelCase.ts` filenames (e.g., `startMembership.ts`) and pin `region('europe-west1')`.

## Testing Guidelines
- Colocate unit tests with source; name them `*.test.ts` to mirror the module.
- Exercise Firestore rules through `pnpm test:rules`; describe notable policy scenarios in PRs.
- Functions integration tests rely on emulators; run `pnpm dev:emu` or `pnpm --filter functions test` before hitting APIs.
- Maintain Playwright coverage for sign-in, billing, and export flows; refresh fixtures when seed data shifts.

## Commit & Pull Request Guidelines
- Follow Conventional Commit prefixes (`feat:`, `fix:`, `chore:`) in present tense.
- Branches use `NNN-short-name`; include the spec path in PRs and keep specs current.
- PRs list executed tests, link issues or NEXT_TASKS items, and add screenshots when UI changes.
- Request review only after required checks (frontend, functions, rules, e2e) succeed.

## Security & Configuration Tips
- Develop against emulators; never commit secrets. Configure Firebase env with `firebase functions:config:set`.
- `firebase.json` enforces strict CSP headers—coordinate before introducing third-party scripts.
- Seed demo data via `curl -X POST http://localhost:5001/<project-id>/europe-west1/seedDatabase`; shared demo passwords are `password123`.
