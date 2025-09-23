import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, addDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { Button } from '@/components/ui';
import { useToast } from '@/components/ui/useToast';

type ExportJob = {
  id: string;
  type: string;
  status: string;
  startedAt?: number | { seconds?: number };
};

const MAX_COLLAPSED_ROWS = 5;

function toMillis(input: ExportJob['startedAt']): number | null {
  if (typeof input === 'number') return input;
  if (input && typeof input.seconds === 'number') return input.seconds * 1000;
  return null;
}

function formatStartedAt(input: ExportJob['startedAt']): string {
  const millis = toMillis(input);
  if (!millis) return '—';
  return new Date(millis).toLocaleString();
}

export function ExportsPanel() {
  const [jobs, setJobs] = useState<ExportJob[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const { push } = useToast();

  useEffect(() => {
    const ref = collection(firestore, 'exports');
    const unsubscribe = onSnapshot(ref, (snapshot) => {
      const next = snapshot.docs.map((doc) => {
        const data = doc.data() as ExportJob;
        return { ...data, id: data.id ?? doc.id };
      });
      setJobs(next);
    }, (error: unknown) => {
      console.error('[exports] Failed to load exports', error);
      push({ type: 'error', message: 'Failed to load exports' });
    });

    return unsubscribe;
  }, [push]);

  const hasRunning = useMemo(
    () => jobs.some((job) => job.status === 'running'),
    [jobs],
  );

  const sortedJobs = useMemo(
    () => [...jobs].sort((a, b) => (toMillis(b.startedAt) ?? 0) - (toMillis(a.startedAt) ?? 0)),
    [jobs],
  );

  const visibleJobs = expanded ? sortedJobs : sortedJobs.slice(0, MAX_COLLAPSED_ROWS);
  const hasMore = sortedJobs.length > MAX_COLLAPSED_ROWS;

  const handleStart = async () => {
    setIsStarting(true);
    try {
      const ref = collection(firestore, 'exports');
      await addDoc(ref, {
        type: 'members',
        status: 'running',
        startedAt: Date.now(),
      });
      push({ type: 'success', message: 'Members CSV export started' });
    } catch (error) {
      console.error('[exports] Failed to start export', error);
      push({ type: 'error', message: 'Failed to start export' });
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
        <Button
          onClick={() => { void handleStart(); }}
          disabled={hasRunning || isStarting}
        >
          Start Members CSV Export
        </Button>
      </div>

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
                <td className="px-3 py-2">{formatStartedAt(job.startedAt)}</td>
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
