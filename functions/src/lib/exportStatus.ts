import * as functions from 'firebase-functions/v1';
import { Timestamp } from 'firebase-admin/firestore';
import { db } from '../firebaseAdmin';

export type ExportStatus =
  | 'pending'
  | 'running'
  | 'success'
  | 'error'
  | 'cancelled'
  | string;

export type ExportProgress = {
  rows?: number;
  bytes?: number;
};

export type ExportRecord = {
  id: string;
  type: string;
  status: ExportStatus;
  createdBy: string;
  createdAt?: string;
  startedAt?: string;
  finishedAt?: string;
  path?: string | null;
  url?: string | null;
  rows?: number;
  size?: number;
  progress?: ExportProgress;
  error?: string | null;
  columns?: string[];
  filters?: Record<string, unknown>;
};

const STATUS_TO_HTTP: Record<string, number> = {
  'permission-denied': 403,
  'failed-precondition': 412,
  'unauthenticated': 401,
  'resource-exhausted': 429,
};

const CODE_TO_STATUS: Record<string, string> = {
  'permission-denied': 'PERMISSION_DENIED',
  'failed-precondition': 'FAILED_PRECONDITION',
  'unauthenticated': 'UNAUTHENTICATED',
  'resource-exhausted': 'RESOURCE_EXHAUSTED',
  'not-found': 'NOT_FOUND',
  'internal': 'INTERNAL',
};

export function mapHttpsErrorToResponse(
  error: functions.https.HttpsError | Error
): {
  status: number;
  body: { error: { code: string; status: string; message: string } };
} {
  if (error instanceof functions.https.HttpsError) {
    const code = error.code ?? 'internal';
    const status =
      STATUS_TO_HTTP[code] ?? (code === 'not-found' ? 404 : 500);
    return {
      status,
      body: {
        error: {
          code,
          status: CODE_TO_STATUS[code] ?? code.toUpperCase(),
          message: error.message,
        },
      },
    };
  }
  return {
    status: 500,
    body: {
      error: {
        code: 'internal',
        status: CODE_TO_STATUS.internal,
        message: String(error),
      },
    },
  };
}

export function requireAdminWithMfa(
  context: functions.https.CallableContext
): NonNullable<functions.https.CallableContext['auth']> {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Sign in required'
    );
  }
  const role = (context.auth.token as Record<string, unknown>)?.role;
  if (role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Admin only');
  }
  const mfaEnabled = Boolean(
    (context.auth.token as Record<string, unknown>)?.mfaEnabled
  );
  if (!mfaEnabled) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'Enable multi-factor authentication to manage exports.'
    );
  }
  return context.auth as NonNullable<functions.https.CallableContext['auth']>;
}

function maybeTimestampToIso(value: unknown): string | undefined {
  if (!value) return undefined;
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }
  if (
    typeof value === 'object' &&
    value !== null &&
    'toDate' in value &&
    typeof (value as { toDate?: () => Date }).toDate === 'function'
  ) {
    const date = (value as { toDate: () => Date }).toDate();
    if (Number.isNaN(date.getTime())) return undefined;
    return date.toISOString();
  }
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return undefined;
    return value.toISOString();
  }
  if (typeof value === 'string') return value;
  return undefined;
}

function coerceProgress(raw: unknown): ExportProgress | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const rows = (raw as { rows?: unknown }).rows;
  const bytes = (raw as { bytes?: unknown }).bytes;
  const progress: ExportProgress = {};
  if (typeof rows === 'number') progress.rows = rows;
  if (typeof bytes === 'number') progress.bytes = bytes;
  return Object.keys(progress).length > 0 ? progress : undefined;
}

export function serializeExportDoc(
  doc:
    | FirebaseFirestore.QueryDocumentSnapshot
    | FirebaseFirestore.DocumentSnapshot
): ExportRecord {
  const data = doc.data() ?? {};
  const status = String(data.status ?? 'pending');
  return {
    id: doc.id,
    type: String(data.type ?? 'unknown'),
    status,
    createdBy: String(data.createdBy ?? ''),
    createdAt: maybeTimestampToIso(data.createdAt),
    startedAt: maybeTimestampToIso(data.startedAt),
    finishedAt: maybeTimestampToIso(data.finishedAt),
    path: data.path ?? null,
    url: data.url ?? null,
    rows: typeof data.rows === 'number' ? data.rows : undefined,
    size: typeof data.size === 'number' ? data.size : undefined,
    progress: coerceProgress(data.progress),
    error: data.error ? String(data.error) : undefined,
    columns: Array.isArray(data.columns)
      ? data.columns.map((col: unknown) => String(col))
      : undefined,
    filters:
      data.filters && typeof data.filters === 'object'
        ? (data.filters as Record<string, unknown>)
        : undefined,
  };
}

export async function listExportsForAdmin(opts: {
  uid: string;
  limit?: number;
}): Promise<ExportRecord[]> {
  const limit = Number.isFinite(opts.limit) ? Math.min(opts.limit!, 50) : 20;
  const snap = await db
    .collection('exports')
    .where('createdBy', '==', opts.uid)
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();
  return snap.docs.map(serializeExportDoc);
}

export async function getExportById(id: string): Promise<ExportRecord | null> {
  const ref = db.collection('exports').doc(id);
  const snap = await ref.get();
  if (!snap.exists) return null;
  return serializeExportDoc(snap);
}

export async function ensureAdminMfaForToken(token: any) {
  if (!token) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Sign in required'
    );
  }
  const role = token.role;
  if (role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Admin only');
  }
  if (!token.mfaEnabled) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'Enable multi-factor authentication to manage exports.'
    );
  }
}
