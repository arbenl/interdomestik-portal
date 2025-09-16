
import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen } from '@/test-utils';
import { useAuth } from '@/hooks/useAuth';
import RoleProtectedRoute from '../RoleProtectedRoute';
import { makeUser } from '@/tests/factories/user';

vi.mock('@/context/AuthProvider');

describe('RoleProtectedRoute', () => {
  it('renders children when user has an allowed role', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: makeUser(),
      isAdmin: true,
      isAgent: false,
      allowedRegions: [],
      loading: false,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOutUser: vi.fn(),
    });

    renderWithProviders(
      <RoleProtectedRoute roles={['admin']}>
        <div>Protected Content</div>
      </RoleProtectedRoute>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('redirects to /signin when user is not authenticated', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isAdmin: false,
      isAgent: false,
      allowedRegions: [],
      loading: false,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOutUser: vi.fn(),
    });

    renderWithProviders(
      <RoleProtectedRoute roles={['admin']}>
        <div>Protected Content</div>
      </RoleProtectedRoute>
    );

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });
});