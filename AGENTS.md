# Repository Guidelines

## Project Structure & Module Organization

- `frontend/`: Vite React app in `frontend/src`, colocated tests as `*.test.ts`, shared hooks in `frontend/src/hooks`, components in `frontend/src/components`, and public assets in `frontend/public`.
- `frontend/e2e/`: Playwright specs covering sign-in, billing, export; refresh fixtures after seed or API changes.
- `functions/`: Firebase Cloud Functions targeting Node 20; entry in `functions/src/index.ts` with reusable logic under `functions/src/lib`; Mocha specs live in `functions/test`.
- `rules/`: Firestore security rules alongside Vitest specs in `rules/tests`; planning docs in `docs/`, feature specs in `specs/`.

## Build, Test & Development Commands

- `pnpm dev:emu`: Launch Hosting (5000), Functions (5001), Firestore (8080), Auth (9099) emulators for integration work.
- `pnpm --filter frontend dev`: Run the Vite dev server against local emulators.
- `pnpm --filter frontend build`: Produce the production bundle and surface TypeScript diagnostics.
- `pnpm --filter frontend test`: Execute Vitest component and hook suites.
- `pnpm --filter functions build` / `pnpm --filter functions test`: Compile Functions and run emulator-backed Mocha tests.
- `pnpm test:rules`: Validate Firestore rules prior to deployment.
- `pnpm --filter frontend e2e`: Run Playwright flows; seed with `curl -X POST http://localhost:5001/<project-id>/europe-west1/seedDatabase` first.

## Coding Style & Naming Conventions

- TypeScript strict mode, 2-space indentation, single quotes, required semicolons.
- React components use PascalCase filenames; hooks live in `frontend/src/hooks` prefixed with `use`.
- Cloud Functions filenames use `camelCase.ts` and declare handlers with `region('europe-west1')`.

## Testing Guidelines

- Frontend: Vitest unit tests beside source files (`*.test.ts`).
- Functions: Mocha suites in `functions/test`, mock emulator data as needed.
- Rules: Run `pnpm test:rules` to keep coverage current; update fixtures when contracts shift.
- E2E: Playwright specs under `frontend/e2e`; reuse shared seed data.

## Commit & Pull Request Guidelines

- Follow Conventional Commits (`feat:`, `fix:`, `chore:`) in present tense; branch names mirror spec IDs (`NNN-short-name`).
- PRs enumerate executed checks (frontend, functions, rules, e2e), link related `docs/NEXT_TASKS.md` items or issues, and include UI screenshots when relevant.
- Never commit secrets; configure runtime env with `firebase functions:config:set` and respect CSP policies in `firebase.json`.

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
