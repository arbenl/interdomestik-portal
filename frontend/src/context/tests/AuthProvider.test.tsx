import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AuthProvider } from '../AuthProvider';
import { useAuth } from '@/hooks/useAuth';
import { makeUser } from '../../tests/factories/user';
import type { User } from 'firebase/auth';

// --- Mock Firebase Auth ---
const mockOnAuthStateChangedCallbacks: ((user: User | null) => void)[] = [];
const mockAuth = {
  currentUser: null as User | null,
};

vi.mock('firebase/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('firebase/auth')>();
  return {
    ...actual,
    getAuth: vi.fn(() => mockAuth),
    onAuthStateChanged: vi.fn((authInstance, callback) => {
      mockOnAuthStateChangedCallbacks.push(callback as (user: User | null) => void);
      // Immediately invoke the callback with the current user state
      (callback as (user: User | null) => void)(mockAuth.currentUser);
      return vi.fn(); // Return an unsubscribe function
    }),
  };
});

// Helper to trigger auth state changes in tests
const triggerAuthStateChanged = (user: User | null) => {
  mockAuth.currentUser = user;
  mockOnAuthStateChangedCallbacks.forEach((cb) => cb(user));
};


const Probe = () => {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  if (user) return <div>logged in</div>;
  return <div>logged out</div>;
};

describe('AuthProvider', () => {
  beforeEach(() => {
    // Reset auth state before each test
    mockAuth.currentUser = null;
    mockOnAuthStateChangedCallbacks.length = 0;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should show loading indicator', () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should show logged out', async () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );
    triggerAuthStateChanged(null);
    expect(await screen.findByText('logged out')).toBeInTheDocument();
  });

  it('should show logged in', async () => {
    const user = makeUser();
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );
    triggerAuthStateChanged(user);
    expect(await screen.findByText('logged in')).toBeInTheDocument();
  });
});