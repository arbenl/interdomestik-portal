import { render, screen, act, waitFor } from '@testing-library/react';
import { useContext } from 'react';
import { AuthProvider } from './AuthProvider';
import { AuthContext } from './AuthContext';
import { describe, it, expect, afterEach } from 'vitest';
import { makeUser } from '@/tests/factories/user';

function TestComponent() {
  const { user, loading } = useContext(AuthContext);
  if (loading) return <div>Loading...</div>;
  return <div>Welcome, {user?.displayName}</div>;
}

describe('AuthProvider', () => {
  afterEach(() => {
    global.__authReset();
  });

  it('provides user context to children after loading', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Simulate user signing in
    await act(async () => {
      global.__authEmit(makeUser({ displayName: 'Test User' }));
    });

    await waitFor(() => {
      expect(screen.getByText(/Welcome, Test User/i)).toBeInTheDocument();
    });
  });
});
