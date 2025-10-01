# Spec: Stabilize Frontend

## Goal

Frontend is always green with pnpm.

## Acceptance Criteria (must all pass)

- pnpm --filter frontend typecheck
- pnpm --filter frontend lint --no-fix
- pnpm --filter frontend build
- pnpm --filter frontend test:ci
- `pnpm why vite` shows a single major version

## Verification Log

- 2025-02-14: `pnpm --filter frontend typecheck`
- 2025-02-14: `pnpm --filter frontend lint --no-fix`
- 2025-02-14: `pnpm --filter frontend build`
- 2025-02-14: `pnpm --filter frontend test:ci`
- 2025-02-14: `pnpm why vite`
- 2025-10-01: `pnpm --filter frontend typecheck`
- 2025-10-01: `pnpm --filter frontend lint --no-fix`
- 2025-10-01: `pnpm --filter frontend build`
- 2025-10-01: `pnpm --filter frontend test:ci`
- 2025-10-01: `pnpm why vite`
