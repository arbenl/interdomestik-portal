import { Route, Routes } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import { AuthContext } from '@/context/AuthContext';
import {
  renderWithProviders,
  screen,
  buildAuthContextFixture,
  type BuildAuthContextOptions,
} from '@/test-utils';
import type { Role } from '@/types';
import RoleProtectedRoute from '../RoleProtectedRoute';

async function renderRoleProtectedRoute({
  fixtureOptions,
  roles = ['admin'],
  redirectTo,
  initialEntries = ['/admin'],
}: {
  fixtureOptions?: BuildAuthContextOptions;
  roles?: Role[];
  redirectTo?: string;
  initialEntries?: string[];
} = {}) {
  const authValue = await buildAuthContextFixture(fixtureOptions);

  return renderWithProviders(
    <AuthContext.Provider value={authValue}>
      <Routes>
        <Route
          path="/admin"
          element={
            <RoleProtectedRoute roles={roles} redirectTo={redirectTo}>
              <div>Protected Content</div>
            </RoleProtectedRoute>
          }
        />
        <Route path="/portal" element={<div>Portal Page</div>} />
        <Route path="/signin" element={<div>Sign In Page</div>} />
        <Route path="/agent" element={<div>Agent Page</div>} />
      </Routes>
    </AuthContext.Provider>,
    { initialEntries }
  );
}

describe('RoleProtectedRoute', () => {
  describe('when user has an allowed role', () => {
    it('renders children when user has an allowed role', async () => {
      await renderRoleProtectedRoute({
        fixtureOptions: { role: 'admin' },
      });

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });
  });

  describe('when user is not authenticated', () => {
    it('redirects to /signin when user is not authenticated', async () => {
      await renderRoleProtectedRoute({
        fixtureOptions: { role: 'guest' },
      });

      expect(screen.getByText('Sign In Page')).toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });
  });

  describe('when user lacks the required role', () => {
    it('redirects to the default portal route', async () => {
      await renderRoleProtectedRoute({
        fixtureOptions: { role: 'member' },
      });

      expect(screen.getByText('Portal Page')).toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('supports a custom redirect path', async () => {
      await renderRoleProtectedRoute({
        fixtureOptions: { role: 'member' },
        redirectTo: '/agent',
      });

      expect(screen.getByText('Agent Page')).toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });
  });

  it('shows a loading state while permissions are being checked', async () => {
    await renderRoleProtectedRoute({
      fixtureOptions: { role: 'guest', loading: true },
    });

    expect(screen.getByText('Checking permissions…')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });
});
