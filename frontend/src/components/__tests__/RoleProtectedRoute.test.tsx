import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, mockUseAuth } from '@/test-utils';
import RoleProtectedRoute from '../RoleProtectedRoute';

vi.mock('@/hooks/useAuth');

describe('RoleProtectedRoute', () => {
  describe('when user has an allowed role', () => {
    beforeEach(() => {
      mockUseAuth({ isAdmin: true });
    });

    it('renders children when user has an allowed role', () => {
      renderWithProviders(
        <RoleProtectedRoute roles={['admin']}>
          <div>Protected Content</div>
        </RoleProtectedRoute>
      );

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });
  });

  describe('when user is not authenticated', () => {
    beforeEach(() => {
      mockUseAuth({ user: null });
    });

    it('redirects to /signin when user is not authenticated', () => {
      renderWithProviders(
        <RoleProtectedRoute roles={['admin']}>
          <div>Protected Content</div>
        </RoleProtectedRoute>
      );

      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });
  });

  describe('when user lacks the required role', () => {
    beforeEach(() => {
      mockUseAuth({ isAdmin: false, isAgent: false });
    });

    it('redirects to the default portal route', () => {
      renderWithProviders(
        <RoleProtectedRoute roles={['admin']}>
          <div>Protected Content</div>
        </RoleProtectedRoute>
      );

      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });
  });
});
