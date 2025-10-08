import { useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AutomationAlert } from '@/hooks/useAutomationAlerts';
import { acknowledgeAlert } from '@/services/alerts';

interface AlertItemProps {
  alert: AutomationAlert;
}

function classNames(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

function alertSeverityVariant(severity: string): string {
  const normalized = severity.toLowerCase();
  if (normalized === 'critical')
    return 'bg-red-100 text-red-700 border border-red-200';
  if (normalized === 'warning')
    return 'bg-yellow-100 text-yellow-700 border border-yellow-200';
  return 'bg-gray-100 text-gray-700 border border-gray-200';
}

export function AlertItem({ alert }: AlertItemProps) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => acknowledgeAlert(alert.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['automationAlerts'] });
    },
  });

  const acknowledged = alert.acknowledged || mutation.isSuccess;
  const acknowledgedAt = useMemo(() => {
    if (alert.acknowledgedAt) return alert.acknowledgedAt.toLocaleString();
    if (mutation.data?.acknowledgedAt)
      return new Date(mutation.data.acknowledgedAt).toLocaleString();
    return null;
  }, [alert.acknowledgedAt, mutation.data?.acknowledgedAt]);

  return (
    <li className="rounded-md border border-gray-200 bg-gray-50 p-3 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium text-gray-900">
          {alert.message || 'Automation issue detected'}
        </span>
        <span
          className={classNames(
            'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold uppercase',
            alertSeverityVariant(alert.severity)
          )}
        >
          {alert.severity}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
        <span className="font-medium text-indigo-700 break-all">
          {alert.url}
        </span>
        <span>Status {alert.status}</span>
        <span>{alert.count} members</span>
        <span>{alert.windowDays} day window</span>
        <span>{alert.actor}</span>
        <span>
          Created {alert.createdAt ? alert.createdAt.toLocaleString() : '—'}
        </span>
        {acknowledgedAt ? <span>Acknowledged {acknowledgedAt}</span> : null}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <span
          className={classNames(
            'text-xs font-medium',
            acknowledged ? 'text-green-700' : 'text-amber-700'
          )}
        >
          {acknowledged ? 'Alert acknowledged' : 'Awaiting acknowledgement'}
        </span>
        <button
          type="button"
          className={classNames(
            'inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500',
            acknowledged
              ? 'border-gray-200 bg-gray-100 text-gray-500 cursor-not-allowed'
              : 'border-indigo-200 bg-white text-indigo-700 hover:border-indigo-300 hover:bg-indigo-50'
          )}
          onClick={() => {
            if (!acknowledged && !mutation.isPending) {
              mutation.mutate();
            }
          }}
          disabled={acknowledged || mutation.isPending}
        >
          {mutation.isPending
            ? 'Saving...'
            : acknowledged
              ? 'Acknowledged'
              : 'Acknowledge'}
        </button>
      </div>
      {mutation.isError ? (
        <p className="mt-2 text-xs text-red-600">
          Failed to acknowledge alert. Try again.
        </p>
      ) : null}
    </li>
  );
}

export default AlertItem;
