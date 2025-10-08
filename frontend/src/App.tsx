import { Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import Layout from '@/components/Layout';
import RoleProtectedRoute from '@/components/RoleProtectedRoute';
import AdminRoute from '@/routes/AdminRoute';
import PortalShell from '@/components/layout/PortalShell';

const Home = lazy(() => import('@/pages/Home'));
const MemberPortal = lazy(() => import('@/pages/MemberPortal'));
const SignIn = lazy(() => import('@/pages/SignIn'));
const SignUp = lazy(() => import('@/pages/SignUp'));
const Profile = lazy(() => import('@/pages/Profile'));
const AgentTools = lazy(() => import('@/pages/AgentTools'));
const Admin = lazy(() => import('@/pages/Admin'));
const Billing = lazy(() => import('@/pages/Billing'));
const Membership = lazy(() => import('@/pages/Membership'));
const PortalEvents = lazy(() => import('@/pages/PortalEvents'));
const PortalSupport = lazy(() => import('@/pages/PortalSupport'));
const PortalDocuments = lazy(() => import('@/pages/PortalDocuments'));
const Verify = lazy(() => import('@/pages/Verify'));
const DashboardPage = lazy(() => import('@/pages/Dashboard/DashboardPage'));

function DashboardRoute() {
  const isDashboardEnabled =
    String(import.meta.env.VITE_FF_DASHBOARD ?? '')
      .trim()
      .toLowerCase() === 'true';

  if (!isDashboardEnabled) {
    return <Navigate to="/" replace />;
  }
  return <DashboardPage />;
}

export default function App() {
  return (
    <Layout>
      <Suspense fallback={<div className="p-6 text-gray-600">Loading…</div>}>
        <Routes>
          <Route index element={<Home />} />
          <Route path="signin" element={<SignIn />} />
          <Route path="signup" element={<SignUp />} />
          <Route path="verify" element={<Verify />} />
          <Route
            element={
              <RoleProtectedRoute roles={['member', 'agent', 'admin']}>
                <PortalShell />
              </RoleProtectedRoute>
            }
          >
            <Route path="portal">
              <Route index element={<MemberPortal />} />
              <Route path="profile" element={<Profile />} />
              <Route path="membership" element={<Membership />} />
              <Route path="billing" element={<Billing />} />
              <Route path="documents" element={<PortalDocuments />} />
              <Route path="events" element={<PortalEvents />} />
              <Route path="support" element={<PortalSupport />} />
            </Route>
            <Route
              path="dashboard"
              element={
                <RoleProtectedRoute roles={['member', 'admin']}>
                  <DashboardRoute />
                </RoleProtectedRoute>
              }
            />
          </Route>
          <Route
            path="profile"
            element={<Navigate to="/portal/profile" replace />}
          />
          <Route
            path="membership"
            element={<Navigate to="/portal/membership" replace />}
          />
          <Route
            path="billing"
            element={<Navigate to="/portal/billing" replace />}
          />
          <Route
            path="admin"
            element={
              <AdminRoute>
                <Admin />
              </AdminRoute>
            }
          />
          <Route
            path="agent"
            element={
              <RoleProtectedRoute roles={['agent', 'admin']}>
                <AgentTools />
              </RoleProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Layout>
  );
}
