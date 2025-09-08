import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import AuthProvider from '../context/AuthContext';
import { useAuth } from './useAuth';
import { onAuthStateChanged } from 'firebase/auth';

function Probe(): JSX.Element {
  const { user, loading } = useAuth();
  return <div>{loading ? 'loading' : (user?.email || 'no-user')}</div>;
}

describe('useAuth within AuthProvider', () => {
  it('exposes user from onAuthStateChanged', async () => {
    // Override the default mock to immediately emit a user
    (onAuthStateChanged as unknown as vi.Mock).mockImplementation((_auth, cb) => { cb({ uid: 'u1', email: 'u1@example.com' }); return () => {}; });
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByText('u1@example.com')).toBeInTheDocument());
  });
});
