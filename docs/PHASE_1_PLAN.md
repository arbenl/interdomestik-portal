# Phase 1 — Self‑Renewal & Payments (Plan)

Goals
- Add Stripe Payment Element (or Checkout) on Billing/Profile.
- Backend endpoint to create PaymentIntent/Checkout Session with `metadata.uid`.
- Webhook mapping: `invoice.payment_succeeded` → `startMembership` (idempotent).
- Renewal UX: expired/renew CTAs, success flow, resend card, emails/receipts.

Scope Checklist
- [ ] Payment Element UI scaffold behind feature flag
- [ ] Callable/HTTP: `createPaymentIntent` (attach `metadata.uid`)
- [ ] Secure client secret exchange; handle 3DS flows
- [ ] Webhook: on `invoice.payment_succeeded`, persist invoice then call `startMembership`
- [ ] Tests: functions integration for signed webhook → membership active
- [ ] Frontend E2E: renew CTA → success
- [ ] Docs: README/PROJECT_GUIDE Stripe setup, env/secrets

Assumptions
- Functions region: `europe-west1`.
- Emulator‑friendly webhook preserved; production uses signature verification.
- Existing audit + metrics extended for renewals.

Milestones
1) Scaffold UI and callable
2) Webhook mapping + integration tests
3) Renewal UX + E2E

