import { render, screen, act } from '@testing-library/react';
import { useContext } from 'react';
import { AuthProvider } from '../AuthProvider';
import { AuthContext } from '../AuthContext';
import { makeUser } from '../../tests/factories/user';
import { describe, it, expect, afterEach } from 'vitest';

declare global {
  var __authEmit: (_user: ReturnType<typeof makeUser> | null) => void;
  var __authReset: () => void;
}

const Probe = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) return null;
  const { user, loading } = ctx;
  if (loading) return <div>Loading...</div>;
  if (user) return <div>logged in as {user.email}</div>;
  return <div>logged out</div>;
};

describe('AuthProvider', () => {
  afterEach(() => {
    global.__authReset?.();
  });

  it('shows logged out state', async () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );

    await act(async () => {
      global.__authEmit(null);
      await Promise.resolve();
    });

    expect(await screen.findByText('logged out')).toBeInTheDocument();
  });

  it('reacts to id token changes', async () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );

    const user = makeUser({ email: 'test@example.com' });

    await act(async () => {
      global.__authEmit(user);
      await Promise.resolve();
    });

    expect(
      await screen.findByText(/logged in as test@example.com/i)
    ).toBeInTheDocument();

    await act(async () => {
      global.__authEmit(null);
      await Promise.resolve();
    });

    expect(await screen.findByText('logged out')).toBeInTheDocument();
  });
});
