import { Route, Routes } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import { AuthContext, type AuthContextType } from '@/context/AuthContext';
import { renderWithProviders, screen } from '@/test-utils';
import { makeUser } from '@/tests/factories/user';
import type { Role } from '@/types';
import type { User } from 'firebase/auth';
import RoleProtectedRoute from '../RoleProtectedRoute';

type ExtendedAuthContextType = AuthContextType & {
  refreshClaims: () => Promise<void>;
};

type AuthOverrides = Omit<Partial<ExtendedAuthContextType>, 'user'> & {
  user?: Partial<User> | null;
};

function createAuthContextValue(
  overrides?: AuthOverrides
): ExtendedAuthContextType {
  const { user: userOverride, ...rest } = overrides ?? {};
  const defaultUser = makeUser();
  const user =
    userOverride === null
      ? null
      : ({
          ...defaultUser,
          ...(userOverride ?? {}),
        } as User);

  const baseValue: ExtendedAuthContextType = {
    user,
    loading: false,
    isAdmin: false,
    isAgent: false,
    allowedRegions: [],
    mfaEnabled: false,
    refreshClaims: vi.fn(() => Promise.resolve()),
    signIn: vi.fn(() => Promise.resolve()),
    signUp: vi.fn(() => Promise.resolve()),
    signOutUser: vi.fn(() => Promise.resolve()),
  };

  return {
    ...baseValue,
    ...rest,
    user,
  };
}

function renderRoleProtectedRoute({
  authOverrides,
  roles = ['admin'],
  redirectTo,
  initialEntries = ['/admin'],
}: {
  authOverrides?: AuthOverrides;
  roles?: Role[];
  redirectTo?: string;
  initialEntries?: string[];
} = {}) {
  const authValue = createAuthContextValue(authOverrides);

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
    it('renders children when user has an allowed role', () => {
      renderRoleProtectedRoute({
        authOverrides: { isAdmin: true },
      });

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });
  });

  describe('when user is not authenticated', () => {
    it('redirects to /signin when user is not authenticated', () => {
      renderRoleProtectedRoute({
        authOverrides: { user: null },
      });

      expect(screen.getByText('Sign In Page')).toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });
  });

  describe('when user lacks the required role', () => {
    it('redirects to the default portal route', () => {
      renderRoleProtectedRoute({
        authOverrides: { isAdmin: false, isAgent: false },
      });

      expect(screen.getByText('Portal Page')).toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('supports a custom redirect path', () => {
      renderRoleProtectedRoute({
        authOverrides: { isAdmin: false },
        redirectTo: '/agent',
      });

      expect(screen.getByText('Agent Page')).toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });
  });

  it('shows a loading state while permissions are being checked', () => {
    renderRoleProtectedRoute({
      authOverrides: { loading: true },
    });

    expect(screen.getByText('Checking permissions…')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });
});
