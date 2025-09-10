# State Snapshot — 2025-09-10

- Branch: feat/phase-1-payments (local changes for Phase 2 not yet pushed)
- Tests: 12 passing, 2 failing (admin_activate, admin_bulk_renew)

Highlights
- Payments: Payment Element scaffold + createPaymentIntent; webhook → startMembership with emails.
- QR security: HS256 signed tokens (mno, exp, kid, jti); verify accepts token and checks revocations.
- Admin: status chip/filter, expiring-soon filter, quick renew + bulk renew; Reports panel with CSV and emulator generate.
- Agent: can only see/edit own members. Seed expanded for agent coverage.

Pending
- Stabilize failing E2E specs (selectors adjusted; re-run pending).
- Finish prod Payment Element (set publishable key + functions secrets).
- Run nameLower backfill to completion and log summary.
- Optional: token rotation UI, async exports, additional charts.

