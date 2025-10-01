# Cleanup Roadmap (next branch)

This roadmap defines the scoped cleanup work we will do on the `next` branch to create a lean baseline for future features without losing history.

## Goals

- Keep history and tests green while removing dead code and unused configs.
- Tighten API surface in Functions and slim the frontend to active features.
- Update docs and CI to reflect the trimmed scope.

## Workstream A — Repository hygiene

- Remove transient artifacts: debug logs, tsbuildinfo, error dumps committed by mistake.
- Keep only PNPM; remove any leftover npm/yarn lockfiles.
- Prune unused scripts in root and packages; keep only used dev/build/test/lint.
- Verify engines/tooling versions and align across packages.

## Workstream B — Frontend slimming

- Remove unused routes, pages, and experimental components not on the roadmap.
- Reduce `features/` to active panels used in Member Portal and Admin.
- Ensure hooks have tests or are removed if unused.
- Verify Tailwind setup and purge any bespoke CSS not referenced.
- Refresh router map in docs to match the reduced surface.

## Workstream C — Functions surface

- Keep only callables/endpoints used by the current UI and runbooks.
- Move business logic under `functions/src/lib/` with thin `index.ts` wrappers.
- Remove deprecated endpoints and internal utilities no longer referenced.
- Re-run emulator tests; adjust or delete tests tied to removed features.

## Workstream D — Rules and Security

- Re-validate `firestore.rules` against the reduced data model.
- Ensure rules tests cover: members, memberships, events (read), billing read.
- Remove rules code paths for removed collections if any.

## Workstream E — CI and Docs

- Simplify CI to required checks only: frontend tests, functions tests, rules tests, e2e (when affected).
- Update README and docs/PROJECT_GUIDE.md with the new flow.
- Keep docs/NEXT_TASKS.md as backlog; remove stale documents or move to `docs/archive/`.

## Milestones

1. A: Hygiene complete; CI green.
2. B + C: Frontend and Functions trimmed with passing tests.
3. D: Rules revalidated; tests adjusted.
4. E: Docs and CI finalized; tag baseline and consider merging `next` to `main`.

## Branching & Process

- Base branch: `next` (protected).
- Open small PRs per workstream item; squash-merge into `next`.
- When ready, open a PR from `next` to `main` and merge after full green.

## Notes

- Emulator-first only; do not add production secrets in code.
- Keep TypeScript strict; avoid `any` unless justified.
