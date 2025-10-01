# Implementation Plan: Stabilize Frontend

## Problem Statement

The frontend pipeline must be consistently green under pnpm across typecheck, lint, build, and test, while ensuring a single Vite major version in the dependency graph.

## Objectives

- Make `pnpm --filter frontend typecheck` pass deterministically.
- Make `pnpm --filter frontend lint --no-fix` pass without code changes.
- Make `pnpm --filter frontend build` succeed on local and CI.
- Make `pnpm --filter frontend test:ci` pass reliably (Vitest).
- Constrain Vite to a single major version (`pnpm why vite` shows one major).

## Constraints & Context

- Monorepo uses pnpm workspaces; frontend is under `frontend/` with Vite + React + Vitest.
- TypeScript strict mode; eslint and tsconfig must be aligned.
- Node LTS required; Functions target Node 20, frontend tools should be compatible.
- Keep changes minimal; do not refactor unrelated areas.

## Diagnostics (to run first)

- Baseline: run each acceptance command to capture errors and logs.
- Tooling versions: record pnpm, node, vite, vitest, typescript, eslint versions.
- Dependency graph: `pnpm why vite` and `pnpm why @vitejs/plugin-react` for major alignment.

## Remediation Strategy

1. Typecheck stability
   - Sync TS versions between root and frontend.
   - Ensure `frontend/tsconfig.json` references correct types and paths; update `vitest.config.ts` tsconfig references if needed.
   - Add missing type packages or adjust `types` includes.

2. Lint stability
   - Ensure eslint config matches parser/ts version; verify `eslint.config.cjs` paths.
   - Add/adjust ignore patterns to exclude generated files.

3. Build stability (Vite)
   - Align Vite major version and plugins.
   - Add `overrides` in root `package.json` if multiple Vite majors are present.
   - Verify env vars and base path; ensure `frontend/vite.config.ts` builds without incompatible plugins.

4. Test stability (Vitest)
   - Ensure `vitest.config.ts` uses `happy-dom` or `jsdom` consistently; install missing peer deps.
   - Fix any flaky tests or timeouts; prefer deterministic timers.

5. Single Vite major enforcement
   - Use `pnpm overrides` to pin a single major for `vite` and related plugins.
   - `pnpm dedupe --check` to validate graph cleanliness.

6. Repeatable verification
   - Add a script `verify:frontend` that runs all acceptance commands in order.
   - Optionally add a lightweight CI job invoking the same script.

## Risks

- Upgrading Vite or plugins may require minor config changes.
- Overrides can mask upstream incompatibilities; test locally and in CI.

## Exit Criteria

All acceptance commands succeed locally and on CI; `pnpm why vite` shows one major.

## Plan Phase 2: Task Generation Approach

- Derive small, independent tasks: diagnostics → config alignment → dependency constraints → CI script.
- Number tasks T001.. with explicit verification commands after each.
- Stop here; the /tasks step will expand into a concrete checklist.
