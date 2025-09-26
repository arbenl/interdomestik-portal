import { useMemo } from 'react';
import useAutomationLogs from '@/hooks/useAutomationLogs';
import useAutomationAlerts from '@/hooks/useAutomationAlerts';
import useAssistantSessions from '@/hooks/useAssistantSessions';
import useAssistantTelemetry from '@/hooks/useAssistantTelemetry';

function formatDate(value: Date | null): string {
  if (!value) return '—';
  return value.toLocaleString();
}

function statusVariant(status: string): string {
  const normalized = status.toLowerCase();
  if (normalized.startsWith('2')) return 'bg-green-100 text-green-700 border border-green-200';
  if (normalized === 'skipped') return 'bg-gray-100 text-gray-700 border border-gray-200';
  return 'bg-red-100 text-red-700 border border-red-200';
}

function alertSeverityVariant(severity: string): string {
  const normalized = severity.toLowerCase();
  if (normalized === 'critical') return 'bg-red-100 text-red-700 border border-red-200';
  if (normalized === 'warning') return 'bg-yellow-100 text-yellow-700 border border-yellow-200';
  return 'bg-gray-100 text-gray-700 border border-gray-200';
}

export function MetricsPanel() {
  const automationQuery = useAutomationLogs();
  const automationAlertsQuery = useAutomationAlerts();
  const assistantQuery = useAssistantSessions();
  const assistantTelemetryQuery = useAssistantTelemetry();

  const assistantStats = useMemo(() => {
    const sessions = assistantQuery.data?.sessions ?? [];
    if (sessions.length === 0) {
      return {
        totalSessions: 0,
        sessions24h: 0,
        roles: new Map<string, number>(),
      };
    }
    const now = Date.now();
    const roles = new Map<string, number>();
    let sessions24h = 0;
    for (const session of sessions) {
      const roleKey = session.role || 'unknown';
      roles.set(roleKey, (roles.get(roleKey) ?? 0) + 1);
      if (session.updatedAt && now - session.updatedAt.getTime() <= 24 * 60 * 60 * 1000) {
        sessions24h += 1;
      }
    }
    return {
      totalSessions: sessions.length,
      sessions24h,
      roles,
    };
  }, [assistantQuery.data?.sessions]);

  const latencyStats = useMemo(() => {
    const entries = assistantTelemetryQuery.data?.entries ?? [];
    if (entries.length === 0) {
      return {
        averageLatencyMs: null as number | null,
        p95LatencyMs: null as number | null,
        fallbackRatePercent: null as number | null,
        sampleSize: 0,
      };
    }
    const latencies = entries
      .map(entry => Number(entry.latencyMs))
      .filter(value => Number.isFinite(value))
      .sort((a, b) => a - b);
    const sampleSize = latencies.length;
    if (sampleSize === 0) {
      const fallbackCount = entries.filter(entry => entry.fallback).length;
      const fallbackRate = entries.length === 0 ? null : (fallbackCount / entries.length) * 100;
      return {
        averageLatencyMs: null,
        p95LatencyMs: null,
        fallbackRatePercent: fallbackRate === null ? null : Math.round(fallbackRate * 10) / 10,
        sampleSize: entries.length,
      };
    }

    const sum = latencies.reduce((total, value) => total + value, 0);
    const averageLatencyMs = Math.round(sum / sampleSize);
    const p95Index = Math.min(sampleSize - 1, Math.max(0, Math.ceil(0.95 * sampleSize) - 1));
    const p95LatencyMs = Math.round(latencies[p95Index]);
    const fallbackCount = entries.filter(entry => entry.fallback).length;
    const fallbackRatePercent = Math.round((fallbackCount / entries.length) * 1000) / 10;

    return {
      averageLatencyMs,
      p95LatencyMs,
      fallbackRatePercent,
      sampleSize: entries.length,
    };
  }, [assistantTelemetryQuery.data?.entries]);

  const automationAlerts = automationAlertsQuery.data?.alerts ?? [];

  return (
    <div className="space-y-6">
      <section aria-labelledby="automation-dashboard" className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 id="automation-dashboard" className="text-lg font-semibold text-gray-900">Automation hooks</h2>
            <p className="text-sm text-gray-500">Latest renewal webhook dispatches. Monitor status codes and volume.</p>
          </div>
          {automationQuery.isLoading ? <span className="text-xs text-gray-400">Loading…</span> : null}
        </div>
        {automationQuery.isError ? (
          <p className="text-sm text-red-600">Failed to load automation logs.</p>
        ) : null}
        {(automationQuery.data?.logs?.length ?? 0) === 0 ? (
          <p className="text-sm text-gray-500">No automation runs recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="px-3 py-2 font-medium">Target</th>
                  <th className="px-3 py-2 font-medium">Window</th>
                  <th className="px-3 py-2 font-medium">Members</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Actor</th>
                  <th className="px-3 py-2 font-medium">Dispatched at</th>
                </tr>
              </thead>
              <tbody>
                {automationQuery.data?.logs.map(log => (
                  <tr key={log.id} className="border-b last:border-none">
                    <td className="px-3 py-2 text-gray-700">
                      <div className="font-medium break-all text-indigo-700">{log.url}</div>
                    </td>
                    <td className="px-3 py-2 text-gray-600">{log.windowDays} days</td>
                    <td className="px-3 py-2 text-gray-600">{log.count}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusVariant(log.status)}`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-600">{log.actor}</td>
                    <td className="px-3 py-2 text-gray-600">{formatDate(log.dispatchedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800">Active alerts</h3>
            {automationAlertsQuery.isLoading ? <span className="text-xs text-gray-400">Loading…</span> : null}
          </div>
          {automationAlertsQuery.isError ? (
            <p className="text-sm text-red-600">Failed to load automation alerts.</p>
          ) : null}
          {!automationAlertsQuery.isLoading && automationAlerts.length === 0 ? (
            <p className="text-sm text-gray-500">No active alerts.</p>
          ) : null}
          {automationAlerts.length > 0 ? (
            <ul className="space-y-2">
              {automationAlerts.map(alert => (
                <li key={alert.id} className="rounded-md border border-gray-200 bg-gray-50 p-3 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-medium text-gray-900">{alert.message || 'Automation issue detected'}</span>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold uppercase ${alertSeverityVariant(alert.severity)}`}>
                      {alert.severity}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
                    <span className="font-medium text-indigo-700 break-all">{alert.url}</span>
                    <span>Status {alert.status}</span>
                    <span>{alert.count} members</span>
                    <span>{alert.windowDays} day window</span>
                    <span>{alert.actor}</span>
                    <span>{formatDate(alert.createdAt)}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </section>

      <section aria-labelledby="assistant-telemetry" className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 id="assistant-telemetry" className="text-lg font-semibold text-gray-900">Assistant telemetry</h2>
            <p className="text-sm text-gray-500">Session volume and recent prompts help you understand assistant engagement.</p>
          </div>
          {assistantQuery.isLoading ? <span className="text-xs text-gray-400">Loading…</span> : null}
        </div>
        {assistantQuery.isError ? (
          <p className="text-sm text-red-600">Failed to load assistant telemetry.</p>
        ) : null}
        {(assistantQuery.data?.sessions?.length ?? 0) === 0 ? (
          <p className="text-sm text-gray-500">No assistant sessions recorded yet.</p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-4">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <p className="text-xs uppercase text-gray-500">Total sessions</p>
              <p className="text-2xl font-semibold text-gray-900">{assistantStats.totalSessions}</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <p className="text-xs uppercase text-gray-500">Sessions (24h)</p>
              <p className="text-2xl font-semibold text-gray-900">{assistantStats.sessions24h}</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <p className="text-xs uppercase text-gray-500">Latency</p>
              <dl className="mt-1 space-y-1 text-sm text-gray-700">
                <div className="flex justify-between"><span>Avg</span><span>{latencyStats.averageLatencyMs != null ? `${latencyStats.averageLatencyMs} ms` : '—'}</span></div>
                <div className="flex justify-between"><span>P95</span><span>{latencyStats.p95LatencyMs != null ? `${latencyStats.p95LatencyMs} ms` : '—'}</span></div>
                <div className="flex justify-between"><span>Fallback</span><span>{latencyStats.fallbackRatePercent != null ? `${latencyStats.fallbackRatePercent.toFixed(1)}%` : '—'}</span></div>
              </dl>
              <p className="mt-2 text-xs text-gray-500">Sample size: {latencyStats.sampleSize}</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <p className="text-xs uppercase text-gray-500">Role breakdown</p>
              <ul className="mt-1 space-y-1 text-sm text-gray-700">
                {Array.from(assistantStats.roles.entries()).map(([role, count]) => (
                  <li key={role} className="flex justify-between"><span className="capitalize">{role}</span><span>{count}</span></li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {(assistantQuery.data?.sessions?.length ?? 0) > 0 ? (
          <div className="mt-4">
            <h3 className="text-sm font-semibold text-gray-800">Recent prompts</h3>
            <ul className="mt-2 space-y-2 text-sm text-gray-700">
              {assistantQuery.data?.sessions.slice(0, 6).map(session => (
                <li key={session.uid} className="rounded-md border border-gray-200 bg-white p-2 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium capitalize text-indigo-700">{session.role}</span>
                    <span className="text-xs text-gray-500">{formatDate(session.updatedAt)}</span>
                  </div>
                  <p className="mt-1 text-gray-600 truncate">{session.lastPrompt || '—'}</p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>
    </div>
  );
}
