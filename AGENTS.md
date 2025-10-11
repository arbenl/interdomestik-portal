# Repository Guidelines

## Project Structure & Module Organization

- `frontend/`: Vite React app in `frontend/src`; colocated unit tests as `*.test.ts`; shared hooks in `frontend/src/hooks`; components in `frontend/src/components`; static assets in `frontend/public`.
- `frontend/e2e/`: Playwright specs for sign-in, billing, export; refresh fixtures after seed/API changes.
- `functions/`: Firebase Cloud Functions (Node 20); entry `functions/src/index.ts`; reusable logic in `functions/src/lib`; Mocha specs in `functions/test`.
- `rules/`: Firestore security rules with Vitest specs in `rules/tests`.
- `docs/` planning notes; `specs/` feature specs.

## Build, Test & Development Commands

- `pnpm dev:emu` — Launch Hosting (5000), Functions (5001), Firestore (8080), Auth (9099).
- `pnpm --filter frontend dev` — Run Vite dev server against local emulators.
- `pnpm --filter frontend build` — Produce production bundle and surface TypeScript diagnostics.
- `pnpm --filter frontend test` — Run Vitest component and hook suites.
- `pnpm --filter functions build` / `pnpm --filter functions test` — Compile and test Cloud Functions with emulator.
- `pnpm test:rules` — Validate Firestore rules prior to deployment.
- `pnpm --filter frontend e2e` — Run Playwright flows; seed first: `curl -X POST http://localhost:5001/<project-id>/europe-west1/seedDatabase`.

## Coding Style & Naming Conventions

- TypeScript strict; 2-space indentation, single quotes, required semicolons.
- React components use PascalCase; hooks live in `frontend/src/hooks` and are prefixed with `use`.
- Cloud Functions filenames use `camelCase.ts`; handlers declare `region('europe-west1')`.
- Keep changes minimal and consistent; avoid unrelated refactors.

## Testing Guidelines

- Frontend: colocated Vitest suites `*.test.ts` beside source files.
- Functions: Mocha in `functions/test`; mock emulator data as needed.
- Rules: run `pnpm test:rules` before PRs to keep coverage current.
- E2E: Playwright under `frontend/e2e`; reuse shared seed data.

## Commit & Pull Request Guidelines

- Conventional Commits (e.g., `feat:`, `fix:`, `chore:`); branch names mirror spec IDs (`NNN-short-name`).
- PRs enumerate executed checks (frontend, functions, rules, e2e), link related `docs/NEXT_TASKS.md` items or issues, and include UI screenshots when relevant.
- Never commit secrets; configure runtime env with `firebase functions:config:set` and respect CSP policies in `firebase.json`.

## Agent-Specific Tips

- Prefer `rg` over `grep`, `fd` over `find`, and `jq` for JSON. Examples: `rg "pattern"`, `rg --files | rg "name"`.
- Debian/Ubuntu install: `sudo apt update && sudo apt install -y ripgrep fd-find jq` (then `alias fd=fdfind`).
- Use `rg -n -A 3 -B 3` for context; tools respect `.gitignore`.
