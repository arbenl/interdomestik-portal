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

  it('shows logged out state', async () => {
    render(<AuthProvider><Probe /></AuthProvider>);

    await act(async () => {
      global.__authEmit(null);
      await Promise.resolve();
    });

    expect(await screen.findByText(/logged out/i)).toBeInTheDocument();
  });

  it('reacts to id token changes', async () => {
    render(<AuthProvider><Probe /></AuthProvider>);

    await act(async () => {
      global.__authEmit(null);
      await Promise.resolve();
    });

    expect(await screen.findByText(/logged out/i)).toBeInTheDocument();

    await act(async () => {
      global.__authEmit(makeUser({ email: 'test@example.com' }));
      await Promise.resolve();
    });

    expect(await screen.findByText(/logged in as test@example.com/i)).toBeInTheDocument();

    await act(async () => {
      global.__authEmit(null);
      await Promise.resolve();
    });

    expect(await screen.findByText(/logged out/i)).toBeInTheDocument();
  });
});
