Session Notes — Stable Snapshot

Date: 2025-09-04

Current Branch
- Name: chore/align-emulator-ports
- Upstream: origin/chore/align-emulator-ports (main is ancestor; branch is ahead)

Repository Status
- Many modified and new files across frontend, functions, cypress, and config.
- Untracked adds include CI workflow, new Cypress specs, and frontend tests.
- Emulators aligned to ports: Hosting 5000, Functions 5001, Firestore 8085, Auth 9099.

Recommended Next Actions
1) Run local checks
   - Frontend: cd frontend && npm test && npm run lint && npm run build
   - Functions: cd functions && npm run build && npm test && npm run lint
   - Rules: npm test (root)
   - Optional E2E: start emulators then npm run cypress:run
2) Stage only stable changes (use git add -p if needed) and commit with Conventional Commits.
3) Rebase on main (fast-forward expected): git fetch origin && git rebase origin/main
4) Push and open PR to main: git push -u origin chore/align-emulator-ports
5) Merge to main after checks pass; then branch from main for further work.

Notes
- firebase.json sets strong CSP and rewrites for verifyMembership, stripeWebhook, exportMembersCsv.
- Cypress config targets Hosting emulator at http://localhost:5000 and includes tasks for resetting emulators and creating users.
- Project id for emulators: demo-interdomestik (.firebaserc).

Hand-off
- After merge, consider tagging a stable snapshot (e.g., v0.1.0) and enabling the CI workflow you added (.github/workflows/ci.yml).

---

2025-09-08 — Session Start
- Created baseline state snapshot: docs/STATE_SNAPSHOT_2025-09-08.md (branch chore/align-emulator-ports @ 577933bb).
- Will add end-of-session snapshot after today’s changes.
