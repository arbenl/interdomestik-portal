import { Suspense, lazy, useCallback } from 'react';
import useAgentOrAdmin from '@/hooks/useAgentOrAdmin';
import AgentRegistrationCard from '@/components/AgentRegistrationCard';
import { useToast } from '@/components/ui/useToast';
import PanelBoundary from '@/components/ui/PanelBoundary';
import { MembersPanel } from '@/features/admin/members/MembersPanel';

import type { ComponentType } from 'react';
const EmulatorPanel = lazy(() => import('@/features/admin/emulator/EmulatorPanel').then(m => ({ default: m.EmulatorPanel }))) as ComponentType<{ refreshUsers: () => void }>;
const RoleManagerPanel = lazy(() => import('@/features/admin/role-manager/RoleManagerPanel').then(m => ({ default: m.RoleManagerPanel })));
const MetricsPanel = lazy(() => import('@/features/admin/metrics/MetricsPanel').then(m => ({ default: m.MetricsPanel })));
const OrgPanel = lazy(() => import('@/features/admin/organizations/OrgPanel').then(m => ({ default: m.OrgPanel }))) as ComponentType<{ push: (t: { type: 'success' | 'error'; message: string }) => void }>;
const CouponPanel = lazy(() => import('@/features/admin/coupons/CouponsPanel').then(m => ({ default: m.CouponsPanel }))) as ComponentType<{ push: (t: { type: 'success' | 'error'; message: string }) => void }>;
const BulkImportPanel = lazy(() => import('@/features/admin/bulk-import/BulkImportPanel').then(m => ({ default: m.BulkImportPanel })));
const MemberSearchPanel = lazy(() => import('@/features/admin/members/MemberSearchPanel').then(m => ({ default: m.MemberSearchPanel })));
const ExportsPanel = lazy(() => import('@/features/admin/exports/ExportsPanel').then(m => ({ default: m.ExportsPanel })));
const CardKeysPanel = lazy(() => import('@/features/admin/card-keys/CardKeysPanel').then(m => ({ default: m.CardKeysPanel })));
const MaintenancePanel = lazy(() => import('@/features/admin/maintenance/MaintenancePanel').then(m => ({ default: m.MaintenancePanel })));
const AuditLogsPanel = lazy(() => import('@/features/admin/audit/AuditLogsPanel').then(m => ({ default: m.AuditLogsPanel })));

export default function Admin() {
  const { isAdmin, canRegister, allowedRegions, loading: roleLoading } = useAgentOrAdmin();
  const { push } = useToast();

  const handleSuccess = useCallback((message: string) => {
    push({ type: 'success', message });
  }, [push]);

  const onError = useCallback((message: string) => {
    push({ type: 'error', message });
  }, [push]);

  if (roleLoading) {
    return <div className="flex justify-center items-center h-screen"><p>Loading...</p></div>;
  }

  const isLocal = typeof location !== 'undefined' && (location.hostname === 'localhost' || location.hostname === '127.0.0.1');
  const loadingFallback = <div className='p-4'>Loading…</div>;

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">{isAdmin ? 'Admin Panel' : 'Agent Panel'}</h2>
      </div>

      <div className="mb-4 p-3 border rounded bg-white text-sm text-gray-700">
        <div>
          <span className="text-gray-600">Claims:</span>{' '}
          <span className="font-medium uppercase">{isAdmin ? 'admin' : (canRegister ? 'agent' : 'member/unknown')}</span>
        </div>
        <div className="mt-1">
          <span className="text-gray-600">Allowed regions:</span>{' '}
          <span className="font-medium">{(allowedRegions && allowedRegions.length > 0)
            ? allowedRegions.join(', ')
            : (isAdmin ? '— (full access)' : '—')}
          </span>
        </div>
      </div>

      {isLocal && (
        <PanelBoundary>
          <Suspense fallback={loadingFallback}>
            <EmulatorPanel refreshUsers={() => {}} />
          </Suspense>
        </PanelBoundary>
      )}

      {canRegister && (
        <AgentRegistrationCard allowedRegions={allowedRegions} onSuccess={handleSuccess} onError={onError} />
      )}

      {isAdmin && (
        <>
          <PanelBoundary>
            <Suspense fallback={loadingFallback}>
              <RoleManagerPanel />
            </Suspense>
          </PanelBoundary>
          <PanelBoundary>
            <Suspense fallback={loadingFallback}>
              <MetricsPanel />
            </Suspense>
          </PanelBoundary>
          <PanelBoundary>
            <Suspense fallback={loadingFallback}>
              <OrgPanel push={push} />
            </Suspense>
          </PanelBoundary>
          <PanelBoundary>
            <Suspense fallback={loadingFallback}>
              <CouponPanel push={push} />
            </Suspense>
          </PanelBoundary>
          <PanelBoundary>
            <Suspense fallback={loadingFallback}>
              <BulkImportPanel />
            </Suspense>
          </PanelBoundary>
          <PanelBoundary>
            <Suspense fallback={loadingFallback}>
              <MemberSearchPanel />
            </Suspense>
          </PanelBoundary>
          <PanelBoundary>
            <Suspense fallback={loadingFallback}>
              <ExportsPanel />
            </Suspense>
          </PanelBoundary>
          <PanelBoundary>
            <Suspense fallback={loadingFallback}>
              <CardKeysPanel />
            </Suspense>
          </PanelBoundary>
          <PanelBoundary>
            <Suspense fallback={loadingFallback}>
              <MaintenancePanel />
            </Suspense>
          </PanelBoundary>
          <PanelBoundary>
            <Suspense fallback={loadingFallback}>
              <AuditLogsPanel />
            </Suspense>
          </PanelBoundary>
          <PanelBoundary>
            <Suspense fallback={loadingFallback}>
              <MembersPanel allowedRegions={allowedRegions} />
            </Suspense>
          </PanelBoundary>
        </>
      )}
    </div>
  );
}
