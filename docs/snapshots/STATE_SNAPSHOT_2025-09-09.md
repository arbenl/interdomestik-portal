# State Snapshot — 2025-09-09

- Timestamp (UTC): $(date -u +%FT%TZ)
- Branch: feat/phase-1-payments
- Commit: c18ecca0

Summary
- Phase 0 merged and tagged (`phase-0`).
- Phase 1 in progress (PR #2 open):
  - Webhook mapping: `invoice.payment_succeeded` → `startMembership` (idempotent) with signed integration test.
  - `createPaymentIntent` callable scaffold and Billing button (emulator-friendly) for client secret.
  - Admin “Search Members” now searches on first character with debounce; supports name/email/memberNo.
  - Firestore rules hardened to avoid null list errors for `allowedRegions`.
  - Hosting rewrites fixed to route HTTP functions to `europe-west1`.
  - Firestore client stabilized for local dev/tests (long polling; simplified persistence).

Next
- Wire Stripe Payment Element (or alternative PSP) when keys/provider are available.
- E2E: renew CTA → success after wiring payment UI.
- Optional: Paysera integration (hosted checkout + webhook) if Stripe not available.

Notes
- Emulators default: Hosting 5000, Functions 5001, Firestore 8085, Auth 9099.
- Test accounts: member1@example.com, member2@example.com, admin@example.com (password: password123).
