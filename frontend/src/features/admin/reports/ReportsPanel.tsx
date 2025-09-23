import { useMemo } from 'react';
import { useReports } from '@/hooks/useReports';

export function ReportsPanel() {
  const { data, isLoading, error } = useReports();

  const rows = useMemo(() => data ?? [], [data]);

  return (
    <section data-testid="reports-panel" aria-label="Monthly reports" className="mb-6 p-4 border rounded bg-white">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Monthly Reports</h3>
        <p className="text-sm text-gray-600">Review recent membership trends across the organisation.</p>
      </div>

      {isLoading && (
        <p className="text-sm text-gray-500">Loading reports…</p>
      )}

      {error && (
        <p className="text-sm text-red-600">Failed to load reports.</p>
      )}

      {!isLoading && !error && (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-600">
                <th className="px-3 py-2">Month</th>
                <th className="px-3 py-2">Members</th>
                <th className="px-3 py-2">Updated</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-3 py-6 text-center text-gray-500">No reports available yet.</td>
                </tr>
              )}
              {rows.map((report) => {
                const monthLabel = report.month ?? report.id;
                const members = typeof report.total === 'number' ? report.total : '—';
                const updatedAt = report.updatedAt?.seconds ? new Date(report.updatedAt.seconds * 1000).toLocaleDateString() : '—';
                return (
                  <tr key={report.id} className="border-t">
                    <td className="px-3 py-2 font-mono text-xs uppercase">{monthLabel}</td>
                    <td className="px-3 py-2">{members}</td>
                    <td className="px-3 py-2">{updatedAt}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
