# Firestore TTL Setup — audit_logs and metrics

Goal: Enable database-enforced retention for `audit_logs` and daily `metrics` using Firestore TTL.

Prerequisites
- App already writes `ttlAt` fields:
  - `audit_logs.ttlAt` ≈ now + 180 days
  - `metrics.ttlAt` ≈ day start + 400 days

Steps (Console)
- Open Firebase Console → Firestore Database → TTL
- Create TTL policy for collection `audit_logs` with field `ttlAt`
  - Confirm field path is exactly `ttlAt` (top-level)
  - Save and wait for policy to become active
- Create TTL policy for collection `metrics` with field `ttlAt`
  - Confirm field path is exactly `ttlAt`
  - Save and wait for policy to become active

Verification
- In TTL panel, both policies show Status: Active
- Inspect recent documents in `audit_logs` and `metrics` to ensure `ttlAt` is present and in the future
- Optionally, use a short-lived test doc with near-future `ttlAt` in a dev project to observe automatic deletion

Notes
- TTL deletions are best-effort and may take time; they do not count against write quotas
- Scheduled job `cleanupExpiredData` also deletes by `ttlAt` as a safety net in case TTL is not enabled

