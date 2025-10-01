# Frontend Slimming Audit

Purpose: identify unused routes/components/hooks/services to safely remove in `next` without breaking UX or tests.

## Routes and Pages

- App routes present: `/`, `/signin`, `/signup`, `/verify`, `/dashboard` (ProtectedRoute), `/portal`, `/billing`, `/profile`, `/membership`, `/admin` (AdminRoute), `/agent`.
- MemberPortal lazily loads panels: ProfilePanel, MembershipPanel, BillingPanel.

Proposals

- Keep: MemberPortal panels, Billing, Profile, Membership, Admin, Agent, Verify, SignIn/Up, Dashboard.
- Review for deprecation:
  - Any legacy routes not linked in Navbar or tests (none detected currently).

## Components

- Navbar: in use via Layout.
- PanelBoundary, UI components: used by MemberPortal and pages.

## Hooks

- Active hooks importing services: useMemberProfile, useMembershipHistory, useInvoices, useUsers, useCardToken.
- Action: For each hook, confirm at least one import site in pages/components; if none, mark for removal.

## Services

- member.ts: used by multiple hooks/components.
- admin.ts: used by useUsers and Navbar prefetch.
- functionsClient.ts: used by ActivateMembershipModal, AgentRegistrationCard, payments box.
- Action: no removals yet; first pass indicates active usage.

## Tests

- Pages and components have tests under `src/pages/__tests__` and `src/components/__tests__`.
- Action: when removing a page/hook, co-remove its colocated tests.

## Next Steps

- Run local static analysis (knip/depcheck) and confirm candidates.
- Remove truly unused files in small PRs, keep CI green.
