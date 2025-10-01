# State Snapshot — 2025-09-08

- Timestamp (UTC): 2025-09-08T17:25:30Z
- Branch: chore/align-emulator-ports
- Commit: 577933bb
- Working tree changes: 656 file(s) modified/untracked (see local `git status` for details)

Scope: Baseline snapshot before today’s work. Use this as the reference to compare against the end-of-session snapshot.

Repository readiness (concise)

- Frontend: Member portal, profile, billing (simulated), verify page, admin/agent flows in place; lazy routes; Tailwind 4; Auth persistence. Unit tests for hooks/components.
- Functions: Callables (upsertProfile, startMembership, setUserRole, searchUserByEmail, agentCreateMember); HTTP (verifyMembership, stripeWebhook placeholder, clearDatabase, exportMembersCsv); scheduled renewal reminders; email queue helpers; uniqueness registries.
- Firestore rules: Member self-access, agent region limits, admin writes, events readable by authed users, billing read restrictions. Rules tests pass.
- E2E: Cypress specs for signup/login, admin journeys (activate, CSV), portal billing, public verify.
- CI: Workflows for lint, frontend unit with coverage, functions tests with coverage (emulators), rules, and E2E (emulators + hosting).

Notable gaps to production

- Stripe signature verification and idempotency; webhook is emulator-friendly only.
- Trigger Email extension/config not shown; integrate/env-configure for production.
- Admin UI for role/region management not exposed (callable exists).
- Bulk import, metrics/KPIs dashboard, audit logs producing code (rules placeholders exist).
- Member number year hardcoded to 2025; consider deriving policy and implementation.
- Feature flags/Remote Config referenced in docs; not wired in code.

Plan for today

- Use this as the start snapshot. After work, record an end-of-session snapshot (commit/branch/status and brief delta summary) as a sibling section or new file.

End-of-session snapshot (to be appended)

- Timestamp (UTC): 2025-09-08T17:32:48Z
- Branch: feat/next-phase
- Commit: 20cc2a04
- Changes summary:
  - Dynamic member number year (env MEMBER_YEAR or UTC year).
  - Rate limiting for verifyMembership (per-IP 60/min, 1000/day; emulator bypassed).
  - Audit logs on setUserRole and startMembership.
  - Admin UI: Role Management (lookup by email, set role, select allowed regions).

---

End-of-day snapshot

- Timestamp (UTC): 2025-09-08T21:00:24Z
- Branch: feat/phase-2
- Commit: db63a136
- Changes summary:
  - Admin search: email, memberNo, and name prefix via nameLower.
  - Writers populate nameLower; added backfillNameLower callable + Admin backfill dialog (start/stop/resume).
  - Profile card shows ACTIVE using summary expiresAt; Download QR now works (canvas fallback).
  - Bulk import (CSV) UI + callable (dry-run/import) with error reporting.
  - Audit Logs panel and Daily Metrics panel in Admin.
  - Stripe webhook signature verification + idempotency (earlier today), startMembership Timestamp fix.
  - Firestore rules hardened to avoid null list errors for allowedRegions.

---

2025-09-09 — Session Snapshot

- Timestamp (UTC): $(date -u +%FT%TZ)
- Branch: feat/phase-2
- Commit: 0fb1aa9c
- Changes summary:
  - Re-enabled Admin Activate E2E with backend verification (no HTTP status intercepts).
  - Admin members list: added cursor-based pagination (Prev/Next) and region filter (uses createdAt desc ordering; respects allowedRegions).
  - Hosting rewrites fixed to route HTTP functions to europe-west1 (verifyMembership, stripeWebhook, exportMembersCsv).
