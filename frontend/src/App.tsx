import { Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import Layout from '@/components/Layout';
import RoleProtectedRoute from '@/components/RoleProtectedRoute';
import AdminRoute from '@/routes/AdminRoute';
//

const Home = lazy(() => import('@/pages/Home'));
const MemberPortal = lazy(() => import('@/pages/MemberPortal'));
const SignIn = lazy(() => import('@/pages/SignIn'));
const SignUp = lazy(() => import('@/pages/SignUp'));
const Profile = lazy(() => import('@/pages/Profile'));
const AgentTools = lazy(() => import('@/pages/AgentTools'));
const Admin = lazy(() => import('@/pages/Admin'));
const Billing = lazy(() => import('@/pages/Billing'));
const Membership = lazy(() => import('@/pages/Membership'));
const Verify = lazy(() => import('@/pages/Verify'));

export default function App() {
  return (
    <Layout>
      <Suspense fallback={<div className='p-6 text-gray-600'>Loading…</div>}>
        <Routes>
          <Route index element={<Home />} />
          <Route path="signin" element={<SignIn />} />
          <Route path="signup" element={<SignUp />} />
          <Route path="verify" element={<Verify />} />
          <Route
            path="portal"
            element={
              <RoleProtectedRoute roles={['member', 'agent', 'admin']}>
                <MemberPortal />
              </RoleProtectedRoute>
            }
          />
          <Route
            path="billing"
            element={
              <RoleProtectedRoute roles={['member', 'agent', 'admin']}>
                <Billing />
              </RoleProtectedRoute>
            }
          />
          <Route
            path="profile"
            element={
              <RoleProtectedRoute roles={['member', 'agent', 'admin']}>
                <Profile />
              </RoleProtectedRoute>
            }
          />
          <Route
            path="membership"
            element={
              <RoleProtectedRoute roles={['member', 'agent', 'admin']}>
                <Membership />
              </RoleProtectedRoute>
            }
          />
          <Route path="admin" element={<AdminRoute><Admin /></AdminRoute>} />
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
