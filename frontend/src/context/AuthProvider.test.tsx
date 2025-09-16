import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AuthProvider } from './AuthProvider';
import { useAuth } from '@/hooks/useAuth';
import { Auth, User } from 'firebase/auth';

vi.mock('@/lib/firebase', () => ({ auth: {} })); // we don't hit real Firebase in unit tests
vi.mock('firebase/auth', () => ({
  onAuthStateChanged: (_auth: Auth, cb: (user: User | null) => void) => { cb(null); return () => {}; },
  signInWithEmailAndPassword: vi.fn().mockResolvedValue({}),
  createUserWithEmailAndPassword: vi.fn().mockResolvedValue({}),
  signOut: vi.fn().mockResolvedValue({})
}));

const Probe = () => {
  const { user, loading } = useAuth();
  return <div>{loading ? 'loading' : user ? 'user' : 'anon'}</div>;
};

describe('AuthProvider', () => {
  it('renders anon when no user', () => {
    render(<AuthProvider><Probe /></AuthProvider>);
    expect(screen.getByText(/anon/i)).toBeInTheDocument();
  });
});
