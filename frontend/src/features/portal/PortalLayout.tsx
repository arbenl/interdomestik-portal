import { Outlet } from 'react-router-dom';
import RoleProtectedRoute from '@/components/RoleProtectedRoute';

export function PortalLayout() {
  return (
    <RoleProtectedRoute roles={['member', 'agent', 'admin']}>
      <div>
        {/* Sidebar/Topbar */}
        <main>
          <Outlet />
        </main>
      </div>
    </RoleProtectedRoute>
  );
}
