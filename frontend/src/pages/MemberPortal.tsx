import { Suspense, lazy } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/auth';
import PanelBoundary from '../components/ui/PanelBoundary';

const ProfilePanel = lazy(() => import('../features/portal/ProfilePanel').then(m => ({ default: m.ProfilePanel })));
const MembershipPanel = lazy(() => import('../features/portal/MembershipPanel').then(m => ({ default: m.MembershipPanel })));
const BillingPanel = lazy(() => import('../features/portal/BillingPanel').then(m => ({ default: m.BillingPanel })));

export default function MemberPortal() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-2">Welcome</h1>
        <p className="mb-4">Please sign in to view your member portal.</p>
        <Link className="text-indigo-600 underline" to="/signin">Go to Sign In</Link>
      </div>
    );
  }

  const loadingFallback = <div className='p-4'>Loading…</div>;

  return (
    <div className="max-w-6xl mx-auto p-4">
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
  );
}
