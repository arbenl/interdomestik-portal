import { render, screen, act } from '@testing-library/react';
import { AuthProvider } from '../AuthProvider';
import { useAuth } from '@/hooks/useAuth';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { makeUser } from '../../tests/factories/user';

// IMPORTANT: ensure the real hook is used for this suite
vi.doUnmock('@/hooks/useAuth');

const Probe = () => {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  if (user) return <div>logged in as {user.email}</div>;
  return <div>logged out</div>;
};

describe('AuthProvider', () => {
  afterEach(() => {
    global.__authReset();
  });

  it('shows logged out state', async () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );
    await act(async () => {
      global.__authEmit(null);
    });
    expect(screen.getByText('logged out')).toBeInTheDocument();
  });

  it('reacts to id token changes', async () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );

    await act(async () => {
      global.__authEmit(makeUser({ email: 'test@example.com' }));
    });

    expect(screen.getByText(/logged in as test@example.com/i)).toBeInTheDocument();

    await act(async () => {
      global.__authEmit(null);
    });

    expect(screen.queryByText(/test@example.com/i)).not.toBeInTheDocument();
    expect(screen.getByText('logged out')).toBeInTheDocument();
  });
});
