# 312 — Testing Hardening

Status: In Progress
Owner: @arbenlila
Target Branch: `312-testing-hardening`

## Summary

Strengthen automated coverage around the membership portal so regressions in admin exports, billing simulation, and role-gated tooling are caught during CI. Align Playwright flows with the consolidated `/signin` experience and keep browser bundles out of version control to reduce noise.

## Goals

- Extend frontend unit tests to verify happy paths and failure handling for admin exports, billing, members, and agent tools panels.
- Update Playwright smoke flows to log in through `/signin` and assert routing to `/profile` before hitting administrative screens.
- Ensure transient Playwright/browser assets stay ignored so local runs do not pollute git status or commits.

## Non-Goals

- Changing production authentication logic or backend Firebase Functions.
- Reworking billing APIs or payment simulator behavior beyond test harness hooks.
- Adding new UI surface area beyond what is needed for exercising existing flows.

## User Stories

- As a maintainer, I need deterministic tests covering admin exports and billing failure modes so I can refactor safely without breaking error messaging.
- As a QA engineer, I want Playwright to exercise the primary sign-in route so the suite mirrors real user navigation.
- As a contributor, I want clean git status after running tests so I can focus on meaningful diffs.

## Acceptance Criteria

- Vitest suites cover admin exports, members panel activation, agent tools mutation flows, and billing happy/error paths with toast assertions and fetch mocks.
- Playwright specs log in through `/signin`, confirm redirect to `/profile`, and reach `/admin` successfully.
- `.playwright-browsers/` (and frontend equivalent caches) remain ignored, preventing large Chromium payloads from showing as untracked files.
- `pnpm --filter frontend build` and `pnpm --filter frontend test` succeed on the branch.

## Test Plan

- Unit: `pnpm --filter frontend test` (focus on new admin/billing suites).
- E2E: `pnpm --filter frontend e2e` against emulators to validate updated Playwright specs.
- Optional smoke: manual visit to `/admin` after emulator sign-in when verifying locally.

## Verification Log

- 2025-09-24: `pnpm --filter frontend build`
- 2025-09-24: `pnpm --filter frontend test`
- 2025-10-01: `pnpm --filter frontend build`
- 2025-10-01: `pnpm --filter frontend test:ci`
- 2025-10-01: `VITE_USE_EMULATORS=1 pnpm --filter frontend e2e`
- 2025-10-01: `FIRESTORE_EMULATOR_HOST=localhost:8080 pnpm test:rules`
