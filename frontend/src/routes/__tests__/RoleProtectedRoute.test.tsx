import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useAuth } from '@/hooks/useAuth';
import { RoleProtectedRoute } from '@/routes/RoleProtectedRoute';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
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

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route element={<RoleProtectedRoute roles={['admin']} />}>
            <Route path="/protected" element={<div>Protected Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
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

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route element={<RoleProtectedRoute roles={['admin']} />}>
            <Route path="/protected" element={<div>Protected Content</div>} />
          </Route>
          <Route path="/signin" element={<div>Signin Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    expect(screen.getByText('Signin Page')).toBeInTheDocument();
  });
});
