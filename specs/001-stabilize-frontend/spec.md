# Spec: Stabilize Frontend

## Goal

Frontend is always green with pnpm.

## Acceptance Criteria (must all pass)

- pnpm --filter frontend typecheck
- pnpm --filter frontend lint --no-fix
- pnpm --filter frontend build
- pnpm --filter frontend test:ci
- `pnpm why vite` shows a single major version

