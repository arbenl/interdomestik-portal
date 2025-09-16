
import { render, screen } from '@testing-library/react';
import { AuthProvider } from './AuthProvider';
import { useAuth } from '@/hooks/useAuth';
import { describe, it, expect } from 'vitest';
import { mockAuth } from '@/tests/mocks/firebaseApp';
import { makeUser } from '@/tests/factories/user';

function TestComponent() {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  return <div>Welcome, {user?.displayName}</div>;
}

describe('AuthProvider', () => {
  it('provides user context to children after loading', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Simulate user signing in
    mockAuth.__emit(makeUser({ displayName: 'Test User' }));

    expect(await screen.findByText(/Welcome, Test User/i)).toBeInTheDocument();
  });
});
