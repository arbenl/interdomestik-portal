import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen } from '@/test-utils';
import RoleProtectedRoute from '@/components/RoleProtectedRoute';
import { useAuth } from '@/context/auth';

vi.mock('@/context/auth');

describe('RoleProtectedRoute', () => {
  it('renders children when user has the required role', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { uid: 'admin-uid' } as any,
      isAdmin: true,
      isAgent: false,
      allowedRegions: [],
      loading: false,
    });

    renderWithProviders(
      <RoleProtectedRoute roles={['admin']}>
        <div>Protected Content</div>
      </RoleProtectedRoute>,
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('redirects when user does not have the required role', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { uid: 'member-uid' } as any,
      isAdmin: false,
      isAgent: false,
      allowedRegions: [],
      loading: false,
    });

    renderWithProviders(
      <RoleProtectedRoute roles={['admin']}>
        <div>Protected Content</div>
      </RoleProtectedRoute>,
    );

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });
});
