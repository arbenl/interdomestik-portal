# Tasks: Stabilize Frontend

Prerequisites:

- Spec and plan present in `specs/001-stabilize-frontend/`.
- Use pnpm workspace from repo root.

Verification legend:

- Run commands exactly as shown; they must succeed without modification.

## Phase 1: Baseline diagnostics

- [x] T001 Record tool versions - Run: `pnpm -v && node -v && pnpm --filter frontend exec vite --version || true && pnpm --filter frontend exec vitest --version || true && pnpm --filter frontend exec tsc -v || true`
- [x] T002 Capture dependency graph for Vite - Run: `pnpm why vite && pnpm why @vitejs/plugin-react || true`

## Phase 2: Typecheck stability

- [x] T003 Ensure consistent TypeScript versions - Check root and `frontend` devDependencies for `typescript` and align to one version; add `overrides.typescript` if needed. - Verify: `pnpm --filter frontend typecheck`
- [x] T004 Fix tsconfig references - Ensure `frontend/tsconfig.json` includes proper `types` and `vitest` if used; ensure `vitest.config.ts` references correct tsconfig. - Verify: `pnpm --filter frontend typecheck`

## Phase 3: Lint stability

- [x] T005 Align ESLint + parser versions - Ensure eslint, @typescript-eslint/\* versions are compatible; adjust config if necessary. - Verify: `pnpm --filter frontend lint --no-fix`
- [x] T006 Update ignore patterns - Exclude `dist/`, `coverage/`, and generated files from lint scope. - Verify: `pnpm --filter frontend lint --no-fix`

## Phase 4: Build stability (Vite)

- [x] T007 Align Vite and plugins to single major - If multiple majors: add `overrides` in root `package.json` for `vite`, `@vitejs/plugin-react`, and related plugins. - Run: `pnpm install && pnpm dedupe` - Verify: `pnpm --filter frontend build`
- [x] T008 Validate env and base config - Ensure `frontend/vite.config.ts` and `.env` usage are CI-safe. - Verify: `pnpm --filter frontend build`

## Phase 5: Test stability (Vitest)

- [x] T009 Ensure test environment deps - Install/align `jsdom` or `happy-dom` as configured; fix peer deps. - Verify: `pnpm --filter frontend test:ci`
- [x] T010 Deflake tests - Fix timeouts and nondeterminism (fake timers, waitFor, etc.). - Verify: `pnpm --filter frontend test:ci`

## Phase 6: Enforce single Vite major

- [x] T011 Enforce via overrides - Add `"overrides": { "vite": "^X.y.z", "@vitejs/plugin-react": "^A.b.c" }` to root `package.json`. - Run: `pnpm install && pnpm dedupe --check` - Verify: `pnpm why vite` shows a single major

## Phase 7: Repeatable verification

- [x] T012 Add root script `verify:frontend` - In `package.json` add: `"verify:frontend": "pnpm --filter frontend typecheck && pnpm --filter frontend lint --no-fix && pnpm --filter frontend build && pnpm --filter frontend test:ci && pnpm why vite"`. - Verify: `pnpm run verify:frontend`

Done when all acceptance criteria pass consistently on local and CI.
