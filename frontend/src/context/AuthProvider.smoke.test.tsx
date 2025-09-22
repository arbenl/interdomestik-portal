import { render, screen, act, waitFor } from '@testing-library/react';
import { AuthProvider } from './AuthProvider';
import { useAuth } from '@/hooks/useAuth';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { makeUser } from '@/tests/factories/user';

// IMPORTANT: ensure the real hook is used for this suite
vi.doUnmock('@/hooks/useAuth');

function TestComponent() {
  const { user, loading } = useAuth();
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