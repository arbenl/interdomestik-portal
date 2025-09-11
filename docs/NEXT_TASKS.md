# NEXT TASKS — Bulletproof Membership Card System

Canonical backlog: This file is the single source of truth for what’s next. Phase plans and notes elsewhere are historical.

Tracking: PR #2 (feat/phase-1-payments → main)

Legend: [ ] TODO • [~] In Progress • [x] Done • (P1/P2/P3) Priority

## Phase 0 — Stabilize & Baseline
- [x] (P1) Re‑enable admin_activate E2E with backend verification only
- [x] (P1) Admin members list: add cursor‑based pagination + region filters
- [ ] (P2) Run nameLower backfill to completion (via Admin dialog) and note final state
- [x] (P2) TTL/cleanup plan for `audit_logs` (>180 days) and `metrics` rollups

Notes:
- Audit logs now include `ttlAt` (+180 days); metrics daily docs include `ttlAt` (+400 days).
- Scheduled cleanup job `cleanupExpiredData` runs daily 03:15 UTC and deletes expired docs.
- Recommended (prod): enable Firestore TTL on `audit_logs.ttlAt` and `metrics.ttlAt` for automatic cleanup.

## Phase 1 — Self‑Renewal & Payments
- [~] (P1) Add Stripe Checkout/Payment Element on Billing/Profile (attach `metadata.uid`) — emulator scaffold done; prod keys/secrets pending
- [x] (P1) Webhook mapping: `invoice.payment_succeeded` → `startMembership` (idempotent)
- [x] (P1) Renewal UX: expired/renew CTAs; badge; card re‑send; emails/receipts
- [x] (P2) Admin renewals: one‑click renew; bulk renew (selection bar)

## Phase 2 — Card Security & Robustness
- [x] (P1) Signed QR tokens (JWT with `memberNo`, `exp`, `kid`,`jti`); verify validates signature + active state
- [~] (P2) Public verify privacy: minimal response; prod rate‑limit (Cloud Armor / captcha option)
- [~] (P2) Revocation/rotation: multi‑key via env + revocation check; add rotation UI next
- [ ] (P3) Optional offline card cache (no PII), prompt re‑verify near expiration

## Phase 3 — Exports, Reporting, Admin Scale
- [ ] (P1) Async CSV export: write to Storage, email signed URL; UI status/progress (HTTP CSV export exists; move to async)
- [~] (P2) Dashboard metrics: expiring next 30 days, active by region/org, renewals trend — initial monthly report + chart done
- [~] (P2) Advanced filters: region, status (done), expiring windows (30d filter added); (P3) full‑text via search service if needed

## Phase 4 — Storage & Attachments (Optional)
- [ ] (P2) Storage rules for attachments (owner/admin/agent by region); deny public
- [ ] (P2) Malware scan on upload; quarantine + logs
- [ ] (P3) Retention policy for attachments

## Phase 5 — Security & Compliance
- [ ] (P1) Rules review: ensure `adminHasRegion`/`agentHasRegion` used across all paths; deny defaults
- [ ] (P1) Secrets: verify Stripe keys in Functions secrets; rotation notes
- [ ] (P2) Audit completeness: all mutating actions logged with actor/target/ts; TTL plan
- [ ] (P2) GDPR/data lifecycle: exports deletion policy; member deletion flow tested

## Phase 6 — Performance & Scale
- [ ] (P1) Sharded `members-<year>` counters or pre‑allocated ranges for memberNo to avoid hotspots
- [ ] (P2) Indexes for admin filters; ensure all list views page (limit+cursor) and no N+1 reads
- [ ] (P3) Load tests: verify bursts, renewal spikes, export queues; observe latency/error budgets

## Phase 7 — Observability & Ops
- [ ] (P2) Structured logs for key actions; reduce noise
- [ ] (P2) Metrics & alerts: webhook failures, verify latency, renewals/day; SLOs + alerting
- [ ] (P2) Runbooks for webhook/export/rules/key rotation incidents
- [ ] (P3) Backups: scheduled Firestore exports; tested restore

## Phase 8 — CI/CD & Developer Experience
- [ ] (P1) Re‑enable full CI (functions/rules/E2E) once billing fixed; cache emulator deps; upload coverage
- [ ] (P2) PR previews on Hosting; optional staging project for smoke tests
- [ ] (P2) Deterministic seeding & fixtures for E2E; flaky test detector
- [ ] (P1) Frontend lint cleanup: eliminate all `any`, add/expand types (Profile, Membership, Invoice, AuditLog, MonthlyReport, Organization, Coupon), fix react-hooks/exhaustive-deps warnings; keep zero lint errors

## Phase 9 — UX & Accessibility
- [ ] (P2) A11y: focus traps, keyboard nav, contrast for badges
- [ ] (P3) i18n scaffold (if needed)
- [ ] (P2) Mobile: card readability across common devices

---

Owners: assign per task in PRs. Update progress with [ ] → [~] → [x].
Open test items: admin_activate and admin_bulk_renew improved; keep monitoring for flakiness.
