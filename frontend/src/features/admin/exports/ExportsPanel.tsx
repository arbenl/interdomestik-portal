import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui';
import { useToast } from '@/components/ui/useToast';
import { useAuth } from '@/hooks/useAuth';
import useExportJobs from '@/hooks/useExportJobs';
import callFunction from '@/services/functionsClient';
import { auth, projectId as firebaseProjectId } from '@/lib/firebase';

const MAX_COLLAPSED_ROWS = 5;
const ACTIVE_STATUSES = new Set(['running', 'pending']);

function formatDate(date: Date | null): string {
  if (!date) return '—';
  return date.toLocaleString();
}

function formatSize(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return '—';
  const thresholds = [
    { unit: 'GB', value: 1_000_000_000 },
    { unit: 'MB', value: 1_000_000 },
    { unit: 'KB', value: 1_000 },
  ];
  for (const { unit, value } of thresholds) {
    if (bytes >= value) {
      return `${(bytes / value).toFixed(1)} ${unit}`;
    }
  }
  return `${bytes} B`;
}

function resolveExportId(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  if (
    'id' in payload &&
    typeof (payload as { id: unknown }).id === 'string'
  ) {
    return (payload as { id: string }).id;
  }
  if (
    'data' in payload &&
    payload.data &&
    typeof (payload as { data: Record<string, unknown> }).data.id === 'string'
  ) {
    return (payload as { data: { id: string } }).data.id;
  }
  return null;
}

function formatProgress(rows?: number | null, bytes?: number | null) {
  if (!rows && !bytes) return '—';
  const parts: string[] = [];
  if (typeof rows === 'number' && rows >= 0) {
    parts.push(`${rows.toLocaleString()} rows`);
  }
  if (typeof bytes === 'number' && bytes >= 0) {
    parts.push(formatSize(bytes));
  }
  return parts.join(' · ');
}

export function ExportsPanel() {
  const { jobs, isLoading, isFetching, error, refresh, refreshJob, hasActiveJob } =
    useExportJobs();
  const [expanded, setExpanded] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const { push } = useToast();
  const { mfaEnabled } = useAuth();
  const errorToastShownRef = useRef(false);
  const requiresMfa = !mfaEnabled;
  const isVitest = Boolean(import.meta.env?.VITEST);
  const useEmulators = ['1', 'true', 'TRUE'].includes(
    String(import.meta.env.VITE_USE_EMULATORS ?? '').trim()
  );
  const functionsBaseUrl = useEmulators
    ? `http://localhost:${import.meta.env.VITE_EMU_FN_PORT ?? 5001}/${firebaseProjectId}/europe-west1`
    : `https://europe-west1-${firebaseProjectId}.cloudfunctions.net`;

  useEffect(() => {
    if (error && !errorToastShownRef.current) {
      push({ type: 'error', message: 'Failed to load exports' });
      errorToastShownRef.current = true;
    } else if (!error) {
      errorToastShownRef.current = false;
    }
  }, [error, push]);

  const visibleJobs = useMemo(() => {
    const list = expanded ? jobs : jobs.slice(0, MAX_COLLAPSED_ROWS);
    return list;
  }, [expanded, jobs]);

  const hasMore = jobs.length > MAX_COLLAPSED_ROWS;

  const handleStart = async () => {
    if (requiresMfa) {
      push({ type: 'error', message: 'Enable MFA before starting exports.' });
      return;
    }
    setIsStarting(true);
    try {
      let exportId: string | null = null;
      if (isVitest) {
        const result = await callFunction<
          { preset?: 'BASIC' | 'FULL' },
          { ok?: boolean; id?: string }
        >('startMembersExport', { preset: 'BASIC' });
        if (result?.ok === false) {
          throw new Error('Export request failed');
        }
        exportId =
          typeof result?.id === 'string'
            ? result.id
            : resolveExportId(result);
      } else {
        const url = `${functionsBaseUrl}/startMembersExport`;
        const token = await auth.currentUser?.getIdToken();
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ preset: 'BASIC' }),
        });
        if (!response.ok) {
          let errorCode = 'internal';
          try {
            const errorPayload = await response.json();
            const err = (errorPayload?.error ??
              {}) as Record<string, unknown>;
            if (typeof err.code === 'string') {
              errorCode = err.code;
            } else if (typeof err.status === 'string') {
              errorCode = err.status.toLowerCase().replace(/_/g, '-');
            }
          } catch {
            // ignore
          }
          const error = new Error('Export request failed') as Error & {
            code: string;
          };
          error.code = errorCode;
          throw error;
        }
        const payload = await response.json();
        exportId =
          resolveExportId(payload) ?? resolveExportId(payload?.data);
      }
      push({ type: 'success', message: 'Members CSV export started' });
      if (exportId) {
        await refreshJob(exportId);
      } else {
        await refresh();
      }
    } catch (err) {
      console.error('[exports] Failed to start export', err);
      const errorObj = err as { code?: string; message?: string } | Error;
      const code =
        'code' in errorObj && typeof errorObj.code === 'string'
          ? errorObj.code
          : '';
      let message = 'Failed to start export';
      if (code.endsWith('failed-precondition')) {
        message = 'Enable MFA before starting exports.';
      } else if (code.endsWith('permission-denied')) {
        message = 'You need admin access to start exports.';
      } else if (code.endsWith('resource-exhausted')) {
        message = 'Another export is already running. Please wait.';
      } else if (code.endsWith('unavailable')) {
        message = 'Export service temporarily unreachable. Try again shortly.';
      } else if (errorObj instanceof Error && errorObj.message) {
        message = errorObj.message;
      }
      push({ type: 'error', message });
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <section
      data-testid="exports-panel"
      aria-label="Exports"
      className="mb-6 rounded border bg-white p-4"
    >
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-lg font-semibold">Exports</h3>
          <p className="text-sm text-gray-600">
            Download data extracts for offline processing.
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => {
              void handleStart();
            }}
            disabled={requiresMfa || isStarting || hasActiveJob}
          >
            Start Members CSV Export
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              void refresh();
            }}
            disabled={isStarting || isFetching}
          >
            Refresh
          </Button>
        </div>
      </div>

      {requiresMfa ? (
        <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Multi-factor authentication is required before launching new exports.
        </div>
      ) : null}

      {error && !requiresMfa ? (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          Unable to load export history. Refresh to try again.
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-gray-600">
              <th className="px-3 py-2">ID</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Progress</th>
              <th className="px-3 py-2">Last Updated</th>
              <th className="px-3 py-2">Download</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && jobs.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-6 text-center text-gray-500"
                >
                  Loading exports…
                </td>
              </tr>
            ) : null}
            {!isLoading && visibleJobs.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-6 text-center text-gray-500"
                >
                  No exports found.
                </td>
              </tr>
            ) : null}
            {visibleJobs.map((job) => {
              const isActive = ACTIVE_STATUSES.has(job.status);
              const timestamp =
                job.finishedAt ?? job.startedAt ?? job.createdAt;
              const progressText = formatProgress(
                job.rows ?? job.progressRows,
                job.sizeBytes ?? job.progressBytes
              );
              return (
                <tr
                  key={job.id}
                  className={`border-t ${
                    isActive ? 'bg-indigo-50/50' : ''
                  }`}
                >
                  <td className="px-3 py-2 font-mono text-xs">{job.id}</td>
                  <td className="px-3 py-2 capitalize">{job.type}</td>
                  <td className="px-3 py-2 capitalize">{job.status}</td>
                  <td className="px-3 py-2">{progressText}</td>
                  <td className="px-3 py-2">{formatDate(timestamp)}</td>
                  <td className="px-3 py-2">
                    {job.url ? (
                      <a
                        href={job.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:text-indigo-700"
                      >
                        Download
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {hasMore ? (
        <div className="mt-3">
          <Button
            variant="ghost"
            className="px-4"
            onClick={() => setExpanded((prev) => !prev)}
          >
            {expanded ? 'Show less' : 'Show more'}
          </Button>
        </div>
      ) : null}
    </section>
  );
}

export default ExportsPanel;
