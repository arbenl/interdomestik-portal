# Exports v2 — Async CSV Pipeline

Author: Engineering  
Last updated: 2025-09-12

## Overview

Exports v2 provides an asynchronous, admin-only pipeline to export selected member fields to CSV. Admins configure filters and columns in the UI; a callable enqueues a job; a Firestore worker streams results to Cloud Storage and returns a signed URL.

## Components

- Callable `startMembersExport` (region: europe-west1)
  - Validates admin role; enforces max 2 concurrent exports per actor
  - Creates `exports/{id}` with: `{ type: 'members_csv', status: 'pending', createdBy, createdAt, filters, columns, progress: { rows, bytes } }`
- Worker `exportsWorkerOnCreate` (Firestore onCreate)
  - Picks up `exports/{id}` where `type==='members_csv'` and `status==='pending'`
  - Sets `status: 'running'`, derives a `path` like `exports/members/members_<date>_<id>.csv`
  - Streams member rows to `gs://<default-bucket>/<path>`; periodically updates `progress`
  - On success: `{ status: 'success', count, size, url? }` (signed URL ~3 days)
  - On error: `{ status: 'error', error }`

## Filters and Columns

Filters (optional):
- `regions: string[]` (intersected with admin's `allowedRegions` claim)
- `status: 'active'|'expired'|'none'`
- `orgId: string`
- `expiringAfter` / `expiringBefore` (date/ISO strings)

Columns:
- Presets: `BASIC` or `FULL`
- BASIC: `memberNo,name,email,phone,region,orgId,active,expiresAt`
- FULL: `memberNo,name,email,phone,region,orgId,status,year,expiresAt,agentId,createdAt,updatedAt`
- Only allowed columns are emitted; `active` is computed

## Operations

Start an export (UI):
- Admin → Exports → choose filters and a preset/columns → Start Export

Monitor progress:
- Watch `exports/{id}` in the UI; `progress.rows` and `progress.bytes` update periodically
- Function logs: `export_worker_start` and `export_worker_done` with `{ export_id, rows, size }`

Download results:
- When `status: 'success'`, use `url` (signed, ~3 days) or the `gs://` path via the Console

Concurrency and limits:
- Max 2 running exports per admin; excess requests receive `resource-exhausted`

Security:
- Storage rules restrict `/exports/**` to admins; writes occur via Admin SDK only
- Treat CSVs as sensitive; share links cautiously and delete locally when no longer needed

Cleanup:
- Signed URLs expire automatically; configure bucket lifecycle rules if you want to auto-delete `exports/members/*.csv` after N days

## Troubleshooting

- Pending forever: ensure Cloud Functions are deployed and `exportsWorkerOnCreate` has permissions on Firestore and Storage
- Permission denied: confirm the calling user has `role=admin` in custom claims
- No signed URL: the object exists but URL generation failed; download via Console using the `gs://` path
- Resource exhausted: wait for existing jobs to complete or avoid parallel requests
