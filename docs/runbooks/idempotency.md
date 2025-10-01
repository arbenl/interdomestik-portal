# Idempotency for Manual/Admin Membership Activations

Goal: Prevent duplicate side effects (emails, receipts, audit logs, metrics) when an admin triggers the same activation repeatedly (retries, double-clicks, network issues).

## Approach

- Scope: Manual/admin path via `startMembership` callable.
- Key: `{uid}:{year}:{source}` with `source=admin`.
- Storage: Firestore doc `idempotency/{key}` created only once.
- Behavior:
  1. Check if `idempotency/{key}` exists → if yes, return early with `idempotent: true`.
  2. Activate membership (idempotent at document level).
  3. Attempt `create()` of `idempotency/{key}`. Only the first caller succeeds.
  4. Send emails, receipts, audit logs, and metrics only when `create()` succeeded (first processing), and only for newly-activated memberships.

This ensures:

- Membership documents converge to the same active state on retries.
- Side effects happen exactly once per (uid, year, source).

## Operational Notes

- A missing/failed idempotency read will fall back to normal activation; duplicate side effects are still guarded by step (3).
- Include an optional `externalRef` in audit logs/receipts separately; it is not part of the core idempotency key to keep behavior predictable for admin flows.
- Extend similarly for new sources (e.g., `source=bulk-admin`), if needed, using the same keying.

## Testing

- Repeated calls to `startMembership` with same (uid, year) return `idempotent: true` after the first success.
- Only one audit entry and one metrics increment appears per key.
- Emails/receipts sent once.
