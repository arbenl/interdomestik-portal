# Functions Surface Audit

Purpose: catalog callable/HTTP functions and identify endpoints not exercised by the current UI/runbooks for potential deprecation.

## Callables (index.ts)
- upsertProfile, setUserRole, startMembership, searchUserByEmail, agentCreateMember, getUserClaims
- importMembersCsv, backfillNameLower, createPaymentIntent, setAutoRenew
- Organization/Coupon helpers: createOrganization, listOrganizations, createCoupon, listCoupons
- Card utilities: getCardToken, getCardKeyStatusCallable, revokeCardToken, resendMembershipCard

## HTTP
- verifyMembership, stripeWebhook, clearDatabase (emulator-only guard)

## Exports pipeline (v2)
- startMembersExport (callable)
- exportsWorkerOnCreate (Firestore onCreate)

## Current UI references
- Profile/Membership/Billing pages call member and billing services which rely on: upsertProfile, startMembership (via admin tools), getCardToken, resendMembershipCard, stripeWebhook (emulator test flow), exports v2 (admin exports page/tests).

## Candidates to review
- createOrganization/listOrganizations: verify if there’s an Admin UI linking to org management; if not, consider removing until needed.
- createCoupon/listCoupons: keep if Admin Coupons page remains; else deprecate.
- importMembersCsv/backfillNameLower: keep if admin import/backfill tools remain; otherwise, move behind an admin-only runbook or remove.

## Safe removals policy
- Remove only endpoints with zero references in frontend/services/tests and not required by runbooks.
- For any removal, add a short note in CHANGELOG and docs/runbooks.md.

