import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { Button } from '@/components/ui';
import { useToast } from '@/components/ui/useToast';
import callFunction from '@/services/functionsClient';
import { useAuth } from '@/hooks/useAuth';

type ExportJob = {
  id: string;
  type: string;
  status: string;
  startedAt?: number | { seconds?: number };
  createdAt?: number | { seconds?: number };
};

const MAX_COLLAPSED_ROWS = 5;

type Timestampish = number | { seconds?: number } | undefined;

function toMillis(input: Timestampish): number | null {
  if (typeof input === 'number') return input;
  if (input && typeof input.seconds === 'number') return input.seconds * 1000;
  return null;
}

function formatStartedAt(job: ExportJob): string {
  const millis = toMillis(job.startedAt ?? job.createdAt);
  if (!millis) return '—';
  return new Date(millis).toLocaleString();
}

export function ExportsPanel() {
  const [jobs, setJobs] = useState<ExportJob[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const { push } = useToast();
  const errorShownRef = useRef(false);
  const pausedRef = useRef(false);
  const { mfaEnabled } = useAuth();
  const requiresMfa = !mfaEnabled;

  const loadJobs = useCallback(async ({ force = false }: { force?: boolean } = {}) => {
    if (pausedRef.current && !force) return;
    try {
      const ref = collection(firestore, 'exports');
      const snapshot = await getDocs(ref);
      const next = snapshot.docs.map((doc) => {
        const data = doc.data() as ExportJob;
        return { ...data, id: data.id ?? doc.id };
      });
      setJobs(next);
      errorShownRef.current = false;
      pausedRef.current = false;
    } catch (error) {
      console.error('[exports] Failed to load exports', error);
      if (!errorShownRef.current) {
        push({ type: 'error', message: 'Failed to load exports' });
        errorShownRef.current = true;
      }
      pausedRef.current = true;
    }
  }, [push]);

  useEffect(() => {
    void loadJobs({ force: true });
    const interval = window.setInterval(() => { void loadJobs(); }, 6000);
    return () => window.clearInterval(interval);
  }, [loadJobs]);

  const hasRunning = useMemo(
    () => jobs.some((job) => ['running', 'pending'].includes(job.status)),
    [jobs],
  );

  const sortedJobs = useMemo(
    () => [...jobs].sort((a, b) => (toMillis(b.startedAt ?? b.createdAt) ?? 0) - (toMillis(a.startedAt ?? a.createdAt) ?? 0)),
    [jobs],
  );

  const visibleJobs = expanded ? sortedJobs : sortedJobs.slice(0, MAX_COLLAPSED_ROWS);
  const hasMore = sortedJobs.length > MAX_COLLAPSED_ROWS;

  const handleStart = async () => {
    if (requiresMfa) {
      push({ type: 'error', message: 'Enable MFA before starting exports.' });
      return;
    }
    setIsStarting(true);
    try {
      const result = await callFunction<{ ok?: boolean; id?: string }, { preset?: 'BASIC' | 'FULL' }>('startMembersExport', { preset: 'BASIC' });
      if (result && typeof result === 'object' && 'ok' in result && result.ok === false) {
        throw new Error('Export request failed');
      }
      push({ type: 'success', message: 'Members CSV export started' });
      void loadJobs({ force: true });
    } catch (error) {
      console.error('[exports] Failed to start export', error);
      let message = 'Failed to start export';
      if (typeof error === 'object' && error && 'code' in error && typeof (error as { code: unknown }).code === 'string') {
        const code = (error as { code: string }).code;
        if (code.endsWith('permission-denied')) message = 'You need admin access to start exports.';
        else if (code.endsWith('resource-exhausted')) message = 'Another export is already running. Please wait.';
        else if (code.endsWith('unavailable')) message = 'Export service temporarily unreachable. Try again shortly.';
      } else if (error instanceof Error && error.message) {
        message = error.message;
      }
      push({ type: 'error', message });
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <section data-testid="exports-panel" aria-label="Exports" className="mb-6 p-4 border rounded bg-white">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <div>
          <h3 className="text-lg font-semibold">Exports</h3>
          <p className="text-sm text-gray-600">Download data extracts for offline processing.</p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => { void handleStart(); }}
            disabled={hasRunning || isStarting || requiresMfa}
          >
            Start Members CSV Export
          </Button>
          <Button
            variant="ghost"
            onClick={() => { void loadJobs({ force: true }); }}
            disabled={isStarting}
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

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-gray-600">
              <th className="px-3 py-2">ID</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Started At</th>
            </tr>
          </thead>
          <tbody>
            {visibleJobs.map((job) => (
              <tr key={job.id} className="border-t">
                <td className="px-3 py-2 font-mono text-xs">{job.id}</td>
                <td className="px-3 py-2 capitalize">{job.type}</td>
                <td className="px-3 py-2 capitalize">{job.status}</td>
                <td className="px-3 py-2">{formatStartedAt(job)}</td>
              </tr>
            ))}
            {visibleJobs.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-gray-500">No exports found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {hasMore && (
        <div className="mt-3">
          <Button
            variant="ghost"
            className="px-4"
            onClick={() => setExpanded((prev) => !prev)}
          >
            {expanded ? 'Show less' : 'Show more'}
          </Button>
        </div>
      )}
    </section>
  );
}
