import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchPortalDashboard } from '@/services/portalDashboard';

const queryKey = ['portalDashboard', 'renewalsWidget'] as const;

export const RenewalsWidget: React.FC = () => {
  const { data, isLoading, isError, error } = useQuery({
    queryKey,
    queryFn: fetchPortalDashboard,
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div
        className="rounded border border-slate-200 bg-white p-4 shadow-sm"
        data-testid="renewals-widget-skeleton"
      >
        <div className="h-4 w-32 animate-pulse rounded bg-slate-200 mb-2" />
        <div className="h-8 w-16 animate-pulse rounded bg-slate-200" />
      </div>
    );
  }

  if (isError) {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === 'string'
          ? error
          : 'Unable to load renewals';
    return (
      <div
        className="rounded border border-red-200 bg-red-50 p-4 text-red-700 shadow-sm"
        role="alert"
      >
        Failed to load renewals. {message}
      </div>
    );
  }

  const renewals = data?.widgets.find((widget) => widget.id === 'renewalsDue');

  return (
    <div className="rounded border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold">Renewals Due (30d)</h2>
      <p
        className="text-3xl font-bold text-slate-900"
        data-testid="renewals-count"
      >
        {renewals?.value ?? '0'}
      </p>
      <p className="text-sm text-slate-600">
        {renewals?.helper ?? 'Members whose memberships expire soon.'}
      </p>
    </div>
  );
};

export default RenewalsWidget;
