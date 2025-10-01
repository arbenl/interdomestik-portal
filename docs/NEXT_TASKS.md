# NEXT TASKS — Bulletproof Membership Card System

Canonical backlog: This file is the single source of truth for what’s next. Phase plans and notes elsewhere are historical.

Tracking: PR #3 (refactor/admin-portal-modularization → main)

Legend: [ ] TODO • [~] In Progress • [x] Done • (P1/P2/P3) Priority

## Phase 10 - Architecture Refactor & Optimization

- [x] (P1) Responsive portal shell: desktop left rail + mobile bottom tabs in `PortalShell`; add icons and events/support stubs before GA.
- [x] (P1) Scope portal dashboard query cache per signed-in user (include uid/allowedRegions in TanStack Query key).
- [x] (P1) Refactor monolithic `Admin.tsx` into modular feature panels.
- [x] (P1) Refactor Member Portal pages into modular feature panels.
- [x] (P1) Introduce TanStack Query for data fetching and caching.
- [x] (P1) Implement granular lazy loading with Suspense for all feature panels.
- [x] (P1) Create a shared `PortalLayout` for the member portal.
- [x] (P1) Implement URL-driven state for list views.
- [x] (P1) Add `PanelBoundary` error boundaries to isolate panel failures.
- [x] (P1) Add `rollup-plugin-visualizer` for bundle analysis.
- [x] (P1) Enforce strict TypeScript and ESLint rules across the new architecture.
- [x] (P1) Update all documentation to reflect the new architecture.

## Phase 0 — Stabilize & Baseline

- [x] (P1) Re‑enable admin_activate E2E with backend verification only
- [x] (P1) Admin members list: add cursor‑based pagination + region filters
- [x] (P2) Run nameLower backfill to completion (via Admin dialog) and note final state — completed 2025‑09‑11 (seed dataset: 1 page, 6 updates; nextStartAfter=null)
  - [x] Confirm all member documents have `nameLower` populated (seed: 66/66 OK)
  - [x] Check for and resolve any errors or skipped records (none observed)
  - [x] Recorded timestamp and updated count.
- [x] (P2) TTL/cleanup plan for `audit_logs` (>180 days) and `metrics` rollups
- [x] (P1) Guard dangerous dev endpoint: lock `clearDatabase` to emulator/admin only (403 in prod)
- [x] (P1) Deterministic active membership on client: orderBy('year','desc') + limit(1) in `useMemberProfile`
- [x] (P1) Enable Firestore TTL in console for `audit_logs.ttlAt` and `metrics.ttlAt` (DB‑enforced retention)

Notes:

- Audit logs now include `ttlAt` (+180 days); metrics daily docs include `ttlAt` (+400 days).
- Scheduled cleanup job `cleanupExpiredData` runs daily 03:15 UTC and deletes expired docs.
- Recommended (prod): enable Firestore TTL on `audit_logs.ttlAt` and `metrics.ttlAt` for automatic cleanup.

## Phase 1 — Self‑Renewal & Payments

- [x] (P1) Add Stripe Checkout/Payment Element on Billing/Profile (attach `metadata.uid`) — emulator scaffold done; prod keys/secrets pending
- [x] (P1) Webhook mapping: `invoice.payment_succeeded` → `startMembership` (idempotent)
- [x] (P1) Renewal UX: expired/renew CTAs; badge; card re‑send; emails/receipts
- [x] (P2) Admin renewals: one‑click renew; bulk renew (selection bar)
- [x] (P1) Idempotency for manual/admin activations (idempotency doc keyed by `{uid,year,source}`)

## Phase 2 — Card Security & Robustness

- [x] (P1) Signed QR tokens (JWT with `memberNo`, `exp`, `kid`,`jti`); verify validates signature + active state
- [x] (P2) Public verify privacy: minimal response; prod rate‑limit (Cloud Armor / captcha option via optional reCAPTCHA check)
- [x] (P2) Revocation/rotation: multi‑key via env + revocation check; rotation UI added (Admin → Card Keys & Tokens; revoke by jti)
- [x] (P3) Optional offline card cache (no PII), prompt re‑verify near expiration — client stores token only when opted-in; near-expiry banner offers refresh
- [x] (P2) Tighten CSP once Tailwind CDN fallback is removed (dropped Tailwind CDN and removed 'unsafe-inline' from script-src and style-src)
- [x] (P2) Functions resource tuning: `.runWith({ memory, timeoutSeconds, concurrency })` on `verifyMembership`, `stripeWebhook`, and exports (exportMembersCsv, exportMonthlyReport)
- [x] (P2) Adopt structured logs (`lib/logger`) across hot paths with consistent fields — verifyMembership, stripeWebhook, startMembership, exportMembersCsv, upsertProfile, user audit, mail queue

## Phase 3 — Exports, Reporting, Admin Scale

- [x] (P1) Async CSV export pipeline: enqueue job + worker
  - [x] Callable `startMembersExport` creates `exports/{id}` (status=pending, filters, columns, createdBy), concurrency guard, safe column presets (BASIC|FULL)
  - [x] Firestore `onCreate` worker streams filtered CSV to GCS (write stream), updates progress (rows/bytes), sets signed URL (3 days), final status=success|error
  - [x] Storage rules for exports: admin-only read (`storage.rules`), writes via Admin SDK
  - [x] Admin exports UI: export builder (filters + columns), live progress, copy link, copy gs:// path, open in GCS, badges, human sizes, show more
- [ ] (P2) Dashboard metrics: expiring next 30 days, active by region/org, renewals trend — initial monthly report + chart done
- [ ] (P2) Advanced filters: region, status (done), expiring windows (30d filter added); (P3) full‑text via search service if needed
- [x] (P2) Members index cleanup: remove collectionGroup index for root `members`; keep `memberships` collectionGroup index

### Upcoming (Feature 101) — Members CSV Export: UI polish + async status

- [ ] (P1) Frontend: Admin Exports panel — show recent jobs with status (pending/running/success/error), rows/bytes, and download link; poll every 3–5s while active
- [ ] (P1) Frontend: `useExportJobs` hook with TanStack Query (list + status polling)
- [ ] (P1) Functions: add `getExportStatus` callable (admin-only) to fetch `{ status, progress, url, error }` by id; optional `getMyExports({limit})`
- [ ] (P1) Rules tests: admin-only read access to `exports/{id}`; non-admin denied
- [ ] (P1) E2E: admin starts export → sees progress → downloads CSV link (emulator)

## Phase 4 — Storage & Attachments (Optional)

- [ ] (P2) Storage rules for attachments (owner/admin/agent by region); deny public
- [ ] (P2) Malware scan on upload; quarantine + logs
- [ ] (P3) Retention policy for attachments

## Phase 5 — Security & Compliance

- [x] (P1) Staff MFA gating: callable `updateMfaPreference`, portal reminder banner, exports require MFA acknowledgement.
- [x] (P1) Document vault MVP: callable `shareDocument`, Firestore ACLs, portal UI with audit notes.
- [x] (P1) Renewal automation hooks: scheduled dispatch + callable trigger with webhook targets.
- [x] (P2) Admin metrics: automation log dashboard + assistant telemetry snapshot.
- [ ] (P1) Rules review: ensure `adminHasRegion`/`agentHasRegion` used across all paths; deny defaults
- [ ] (P1) Secrets: verify Stripe keys in Functions secrets; rotation notes
- [ ] (P2) Audit completeness: all mutating actions logged with actor/target/ts; TTL plan
- [ ] (P2) GDPR/data lifecycle: exports deletion policy; member deletion flow tested
- [x] (P2) App Check (prod): client scaffolding added (reCAPTCHA v3 via VITE_APPCHECK_SITE_KEY); enable enforcement on Firestore/Functions in console

## Phase 6 — Performance & Scale

- [ ] (P1) Sharded `members-<year>` counters or pre‑allocated ranges for memberNo to avoid hotspots
- [ ] (P2) Indexes for admin filters; ensure all list views page (limit+cursor) and no N+1 reads
- [ ] (P3) Load tests: verify bursts, renewal spikes, export queues; observe latency/error budgets

## Phase 7 — Observability & Ops

- [ ] (P2) Structured logs for key actions; reduce noise
- [~] (P2) Metrics & alerts: webhook failures, verify latency, renewals/day; SLOs + alerting — assistant latency telemetry + automation alerts shipped 2025-09-25; SLO wiring pending
- [ ] (P2) Runbooks for webhook/export/rules/key rotation incidents
- [ ] (P3) Backups: scheduled Firestore exports; tested restore
- [ ] (P2) Define SLOs for `verifyMembership` latency and webhook success; wire alerts (email/Slack)

## Phase 8 — CI/CD & Developer Experience

- [ ] (P1) Re‑enable full CI (functions/rules/E2E) once billing fixed; cache emulator deps; upload coverage
- [ ] (P2) PR previews on Hosting; optional staging project for smoke tests
- [ ] (P2) Deterministic seeding & fixtures for E2E; flaky test detector
- [x] (P1) Frontend lint cleanup: eliminate all `any`, add/expand types (Profile, Membership, Invoice, AuditLog, MonthlyReport, Organization, Coupon), fix react-hooks/exhaustive-deps warnings; keep zero lint errors
- [x] (P2) Consolidate Cypress config: keep a single `cypress.config.ts` (removed duplicate under `cypress/`)
- [x] (P2) Type‑aware ESLint (frontend): enable type‑checked rules (projectService)
- [ ] (P2) Coverage gates: minimum thresholds for frontend (Vitest) and functions (c8) when CI_LIGHT=false
- [x] (P2) One‑command scripts: `dev:all` (emulators + Vite) and `test:all` (rules + functions + frontend)
- [x] (P2) Typed Firestore converters: `withConverter<T>()` for client collections (Profile, Membership, Invoice, Events, Reports, Audit Logs)
- [x] (P2) Tests added: export filter parsing + CSV streaming worker; startMembership idempotency; Admin UI tests (exports builder & card keys)
- [x] (P3) Bundle analysis: add `analyze` script with vite bundle visualizer

## Phase 9 — UX & Accessibility

- [ ] (P2) A11y: focus traps, keyboard nav, contrast for badges
- [ ] (P3) i18n scaffold (if needed)
- [ ] (P2) Mobile: card readability across common devices
- [x] (P2) SPA navigation polish: use `useNavigate` in PortalHero instead of `location.href`
- [x] (P2) Live UI updates: switch invoices/memberships hooks to `onSnapshot` with cleanups (also profile active membership)
- [x] (P2) Live UI updates: switch events, reports, and audit logs to `onSnapshot` with cleanups
- [x] (P2) Config flags: read projectId and feature flags from env (remove hardcoded `demo-interdomestik`)
- [x] (P2) Verify page: send reCAPTCHA token in header when configured (`x-recaptcha-token`)
- [x] (P2) Role visibility: show member `role` in Admin tables and on the membership card

---

Owners: assign per task in PRs. Update progress with [ ] → [~] → [x].
Open test items: admin_activate and admin_bulk_renew improved; keep monitoring for flakiness.
