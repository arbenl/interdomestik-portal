# Repository Guidelines

## Project Structure & Module Organization
- `frontend/`: React + TypeScript via Vite; source in `frontend/src`, colocated unit tests as `*.test.ts`, and public assets under `frontend/public`.
- `frontend/e2e`: Playwright specs for critical flows; refresh fixtures when seed data or APIs change.
- `functions/`: Firebase Cloud Functions on Node 20; export handlers in `functions/src/index.ts`, keep reusable logic in `functions/src/lib`, and test with Mocha suites in `functions/test`.
- `rules/`: Firestore security rules with matching Vitest specs; update `rules/tests` alongside rule changes. Planning docs live in `docs/`, feature specs in `specs/`.

## Build, Test & Development Commands
- `pnpm dev:emu`: Start Hosting (5000), Functions (5001), Firestore (8080), and Auth (9099) emulators for local integration.
- `pnpm --filter frontend dev`: Run Vite dev server pointing at emulators.
- `pnpm --filter frontend build`: Compile production bundle and surface TypeScript errors.
- `pnpm --filter frontend test`: Execute Vitest component and hook suites.
- `pnpm --filter functions build` / `pnpm --filter functions test`: Build Cloud Functions and run emulator-backed Mocha tests.
- `pnpm test:rules`: Validate Firestore rules before deployment.
- `pnpm --filter frontend e2e`: Launch Playwright scenarios; seed data with the `seedDatabase` function first.

## Coding Style & Naming Conventions
- TypeScript strict mode, 2-space indentation, single quotes, required semicolons.
- Place React components in `frontend/src/components` (PascalCase files) and hooks in `frontend/src/hooks` prefixed with `use`.
- Cloud Function modules use `camelCase.ts` filenames and call `region('europe-west1')`.

## Testing Guidelines
- Keep tests beside source files (`*.test.ts`); use Vitest for frontend, Mocha for functions, and Playwright for flows like sign-in, billing, and export.
- Maintain Firestore rule coverage with `pnpm test:rules`; update fixtures whenever API contracts or seed data shift.

## Commit & Pull Request Guidelines
- Follow Conventional Commits (`feat:`, `fix:`, `chore:`) in present tense; branches match spec IDs (`NNN-short-name`).
- PRs list executed checks (frontend, functions, rules, e2e), link relevant `docs/NEXT_TASKS.md` items or issues, and attach UI screenshots when applicable.

## Security & Configuration Tips
- Develop against emulators, never commit secrets, and configure runtime env with `firebase functions:config:set`.
- Respect the strict CSP in `firebase.json`; coordinate before adding third-party scripts.
- Seed demo data via `curl -X POST http://localhost:5001/<project-id>/europe-west1/seedDatabase`; shared demo password is `password123`.
<!-- FAST-TOOLS PROMPT v1 | codex-mastery | watermark:do-not-alter -->

## CRITICAL: Use ripgrep, not grep

NEVER use grep for project-wide searches (slow, ignores .gitignore). ALWAYS use rg.

- `rg "pattern"` — search content
- `rg --files | rg "name"` — find files
- `rg -t python "def"` — language filters

## File finding

- Prefer `fd` (or `fdfind` on Debian/Ubuntu). Respects .gitignore.

## JSON

- Use `jq` for parsing and transformations.

## Install Guidance

- macOS: `brew install ripgrep fd jq`
- Debian/Ubuntu: `sudo apt update && sudo apt install -y ripgrep fd-find jq` (alias `fd=fdfind`)

## Agent Instructions

- Replace commands: grep→rg, find→rg --files/fd, ls -R→rg --files, cat|grep→rg pattern file
- Cap reads at 250 lines; prefer `rg -n -A 3 -B 3` for context
- Use `jq` for JSON instead of regex

<!-- END FAST-TOOLS PROMPT v1 | codex-mastery -->
