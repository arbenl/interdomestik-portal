import { Suspense, lazy } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import usePortalDashboard from '@/hooks/usePortalDashboard';
import { isFeatureEnabled } from '@/constants/featureFlags';
import { AssistantLauncher } from '@/components/assistant/AssistantLauncher';
import { DashboardWidgetGrid } from '@/components/dashboard/DashboardWidgetGrid';
import PortalShell from '@/components/layout/PortalShell';
import PanelBoundary from '../components/ui/PanelBoundary';

const ProfilePanel = lazy(() =>
  import('../features/portal/ProfilePanel').then((m) => ({
    default: m.ProfilePanel,
  }))
);
const MembershipPanel = lazy(() =>
  import('../features/portal/MembershipPanel').then((m) => ({
    default: m.MembershipPanel,
  }))
);
const BillingPanel = lazy(() =>
  import('../features/portal/BillingPanel').then((m) => ({
    default: m.BillingPanel,
  }))
);

export default function MemberPortal() {
  const { user, isAdmin, isAgent } = useAuth();
  const showAssistant = isFeatureEnabled('assistant');
  const showWidgetsFlag = isFeatureEnabled('widgets');
  const dashboard = usePortalDashboard({ enabled: showWidgetsFlag });
  const canShowWidgets = dashboard.enabled;

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-2">Welcome</h1>
        <p className="mb-4">Please sign in to view your member portal.</p>
        <Link className="text-indigo-600 underline" to="/signin">
          Go to Sign In
        </Link>
      </div>
    );
  }

  const loadingFallback = <div className="p-4">Loading…</div>;

  return (
    <PortalShell
      header={
        canShowWidgets ? (
          <DashboardWidgetGrid
            widgets={dashboard.widgets}
            layout={dashboard.layout}
            availableWidgets={dashboard.availableWidgets}
            isLoading={dashboard.isLoading}
            isUpdating={dashboard.updating}
            onRefresh={dashboard.refresh}
            onLayoutChange={dashboard.updateLayout}
          />
        ) : null
      }
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <PanelBoundary>
          <Suspense fallback={loadingFallback}>
            <ProfilePanel />
          </Suspense>
        </PanelBoundary>
        <PanelBoundary>
          <Suspense fallback={loadingFallback}>
            <MembershipPanel />
          </Suspense>
        </PanelBoundary>
        <PanelBoundary>
          <Suspense fallback={loadingFallback}>
            <BillingPanel />
          </Suspense>
        </PanelBoundary>
      </div>
      {showAssistant && (isAdmin || isAgent) && <AssistantLauncher />}
    </PortalShell>
  );
}
