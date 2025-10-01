import { useMetrics } from '@/hooks/admin/useMetrics';

function RegionBarChart({ data }: { data: Record<string, number> }) {
  const entries = Object.entries(data);
  if (entries.length === 0)
    return <div className="text-gray-600 text-sm">No data.</div>;
  const max = Math.max(...entries.map(([, v]) => v || 0), 1);
  return (
    <div className="space-y-1">
      {entries.map(([k, v]) => (
        <div key={k} className="flex items-center gap-2">
          <div className="w-28 text-xs text-gray-600">{k}</div>
          <div className="h-3 bg-gray-200 rounded w-full">
            {(() => {
              const ratio = Math.max(0, Math.min(1, (v || 0) / max));
              const pct = Math.round(ratio * 100);
              const wClass =
                pct >= 88
                  ? 'w-full'
                  : pct >= 63
                    ? 'w-3/4'
                    : pct >= 38
                      ? 'w-1/2'
                      : pct >= 13
                        ? 'w-1/4'
                        : 'w-0';
              return <div className={`h-3 bg-indigo-500 rounded ${wClass}`} />;
            })()}
          </div>
          <div className="w-10 text-xs text-gray-700 text-right">{v || 0}</div>
        </div>
      ))}
    </div>
  );
}

export function MetricsPanel({ dateKey }: { dateKey: string }) {
  const { data, isLoading, error } = useMetrics(dateKey);
  const isLocal =
    typeof location !== 'undefined' &&
    (location.hostname === 'localhost' || location.hostname === '127.0.0.1');

  if (isLoading) return <div className="text-gray-600">Loading…</div>;
  if (error)
    return (
      <div className="text-red-600">
        Failed to load metrics: {error.message}
      </div>
    );

  const total = data?.activations_total || 0;
  const byRegion = data?.activations_by_region || {};

  return (
    <div className="mb-6 p-4 border rounded bg-white">
      <h3 className="text-lg font-semibold mb-2">Daily Metrics</h3>
      <div className="text-sm text-gray-600">Date: {dateKey}</div>
      <div className="mt-2">
        Activations today: <span className="font-semibold">{total}</span>
      </div>
      <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-2">
        {Object.keys(byRegion).length === 0 ? (
          <div className="text-sm text-gray-500">No per-region data</div>
        ) : (
          Object.entries(byRegion).map(([r, n]) => (
            <div key={r} className="text-sm">
              <span className="text-gray-600">{r}:</span>{' '}
              <span className="font-medium">{String(n)}</span>
            </div>
          ))
        )}
      </div>
      {isLocal && (
        <div className="mt-2 text-xs text-gray-500">
          Note: metrics are best-effort and update on membership activation.
        </div>
      )}
      {Object.keys(byRegion).length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-semibold mb-1">By Region</h4>
          <RegionBarChart data={byRegion} />
        </div>
      )}
    </div>
  );
}
