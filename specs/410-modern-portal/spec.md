# 410 — Modern Member Portal

Status: Draft
Owner: @arbenlila
Target Branch: `410-modern-portal`

## Summary

Deliver a modernization pass that brings Interdomestik’s member portal in line with contemporary expectations: a guided assistant, customizable analytics, mobile-first engagement surfaces, and reinforced account security. This spec sequences the work into ship-ready slices so each milestone can merge independently while converging on a unified experience.

## Goals

- Introduce an AI-guided assistant that surfaces contextual help, renewal prompts, and workflow shortcuts inside the portal shell.
- Replace the static landing panels with configurable analytics widgets for admins and agents, including membership renewals, billing KPIs, and engagement metrics.
- Refresh member-facing navigation with mobile-first layouts, responsive event discovery, and “next steps” tiles across `/portal` routes.
- Add self-service security upgrades: MFA enrollment prompts, secure document sharing, audit-friendly activity logging, and alerting hooks.

## Non-Goals

- Replacing Firebase authentication or migrating away from Firestore.
- Implementing full CRM integrations beyond webhook/automation hooks scoped below.
- Building a dedicated mobile app; focus on responsive web.

## User Stories

- As a member, I want an assistant that answers policy questions and reminds me about renewals so I can act quickly without contacting support.
- As an admin, I want a customizable dashboard with renewal, revenue, and event KPIs so I can prioritize outreach at a glance.
- As a security lead, I need members and staff to enroll in MFA and access documents with granular permissions so audits pass without exceptions.

## UX Notes

- Introduce an `AssistantDrawer` accessible from a floating help button; designs should cover desktop and <=375px widths.
- Dashboard widgets: cards for renewals due, payments captured, event registrations, and churn risk; allow drag-and-drop ordering with a modal library picker.
- Portal routes adopt a two-tier nav: sticky bottom tabs on mobile, left rail on desktop. Event listings use card carousels with quick filters for region and date.
- Document vault surfaces secure file previews with activity timestamps; integrate toast messaging for permission updates.

## Data Model / APIs

- Store widget layouts per user in `portalLayouts/{uid}` with `widgets: Array<{ id, type, order, settings }>`.
- Add `assistantSessions/{uid}` collection capturing prompts/responses (retain <30 days) for analytics.
- Extend functions: `startAssistantSuggestion` (callable, proxies AI provider), `upsertPortalLayout`, `updateMfaPreference`, `shareDocument` (signed URL + ACL write).
- Webhooks: add optional `automationHooks` configuration enabling outbound POSTs when renewals cross thresholds.

## Security

- Require `role` claim checks plus new `mfaEnabled` flag before granting access to billing exports.
- Firestore rules: enforce ownership on `portalLayouts/{uid}` and limited read scope on `assistantSessions` (self + admins), add document share ACL checks, and tests covering failure cases.
- MFA enrollment surfaced via Firebase Auth multi-factor API; block high-risk actions until enrollment confirmed.

## Acceptance Criteria

- Portal assistant MVP: contextual prompts available on `/portal/profile`, `/portal/membership`, `/admin`; caches last 5 interactions per user; offline fallback message provided.
- Dashboard widgets: admins/agents can add/remove/reorder at least six widget types; layout persists per user; defaults provided for new accounts.
- Responsive shell: Playwright mobile viewport (iPhone 12) validates sticky tab nav; desktop E2E asserts accessibility landmarks and keyboard focus order.
- Security hardening: MFA required toggle enforced, document sharing emits audit entries, and automation hooks tested via emulator HTTP targets.
- CI: `pnpm --filter frontend build`, `pnpm --filter frontend test`, `pnpm --filter frontend e2e`, `pnpm --filter functions test`, and `pnpm test:rules` all pass on feature branch.

## Rollout & Migration

- Phase 1: ship assistant + basic widgets behind feature flags (`VITE_FLAG_ASSISTANT`, `VITE_FLAG_WIDGETS`).
- Phase 2: enable responsive shell and document vault updates; run backfill script to seed default layouts for existing users.
- Phase 3: enforce MFA requirement and activate automation hooks; notify admins one week prior via in-app banner.
- Provide staging sign-off checklist covering assistant responses, widget layouts, and MFA flows before toggling flags in production.

## Test Plan

- Frontend: Vitest for assistant hook, widget layout reducer, and responsive nav utilities.
- Functions: Mocha integration tests for new callables, automation hook scheduler, and ACL flows.
- Rules: Add unit tests asserting layout ownership, assistant session read limitations, and document share ACL enforcement.
- E2E: Playwright scenarios for assistant interactions, widget customization, mobile tab navigation, MFA enrollment, and secure document sharing.

## Observability

- Emit structured logs for assistant invocations (`assistantSessions` id, latency, fallback status) and widget mutations.
- Add `portal_modernization` dashboard to monitoring with charts for assistant usage, MFA enrollment rate, and automation hook success/failure counts.
- Update runbooks in `docs/operations` with assistant troubleshooting, widget rollback steps, and MFA enforcement toggles.

## Current Priority Focus (2025-09-25)

1. Ship the portal assistant MVP end-to-end (callable responder, frontend hook, conversation persistence).
2. Introduce the responsive portal shell with mobile tab navigation and desktop rail.
3. Enforce MFA-aware security flows and document sharing audit entries before GA.

## Progress Log — 2025-09-25

- ✅ Assistant MVP wired: `startAssistantSuggestion` callable, per-user transcripts, responsive drawer UI, and frontend tests in place.
- ✅ Responsive shell scaffold landed: `/portal` renders inside `PortalShell` with desktop rail + mobile tabs; Profile, Membership, Billing reuse the shell.
- ✅ Resolved: scoped TanStack Query cache per signed-in admin/agent (dashboard query now keyed with `uid` + `allowedRegions`).
- ✅ Responsive nav polish delivered: shell nav now includes icons plus Events/Support placeholders across desktop and mobile.
- ✅ Staff MFA reminder + gating: portal banner + `updateMfaPreference` callable ensure exports stay blocked until MFA acknowledged.
- ✅ Document vault MVP shipped: `shareDocument` callable, Firestore ACLs, and portal Documents page with activity feed stub.
- ✅ Document activity surfaced in portal with per-share history.
- ✅ Renewal automation hooks send POST payloads to configured targets.
- ✅ Automation status/assistant telemetry dashboards added to Admin metrics panel.
- ✅ Assistant latency metrics and automation alerts surfaced in the Admin metrics panel.
- ⏭️ Next session: add assistant latency dashboards to ops runbooks and build alert acknowledgement workflow.
