import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { AuthProvider } from './AuthProvider';
import { useAuth } from '@/hooks/useAuth';
import { makeUser } from '@/tests/factories/user';

vi.mock('@/lib/firebase', () => ({ auth: {} }));

const Probe = () => {
  const { user, loading } = useAuth();
  if (loading) return <div>loading</div>;
  if (!user) return <div>logged out</div>;
  return <div>logged in as {user.email}</div>;
};

describe('AuthProvider', () => {
  afterEach(() => {
    global.__authReset();
  });

  it('shows logged out state', () => {
    render(<AuthProvider><Probe /></AuthProvider>);
    expect(screen.getByText(/logged out/i)).toBeInTheDocument();
  });

  it('reacts to id token changes', async () => {
    render(<AuthProvider><Probe /></AuthProvider>);
    expect(screen.getByText(/logged out/i)).toBeInTheDocument();

    await act(async () => {
      global.__authEmit(makeUser({ email: 'test@example.com' }));
    });

    expect(screen.getByText(/logged in as test@example.com/i)).toBeInTheDocument();

    await act(async () => {
      global.__authEmit(null);
    });
    expect(screen.getByText(/logged out/i)).toBeInTheDocument();
  });
});
