import { vi } from 'vitest';
import type { User } from 'firebase/auth';

// State for onIdTokenChanged listeners
const authListeners: Set<(user: User | null) => void> = new Set();
const _emit = (user: User | null) => {
  authListeners.forEach((cb) => cb(user));
};

export const mockAuth = {
  onIdTokenChanged: vi.fn((cb: (user: User | null) => void) => {
    authListeners.add(cb);
    return () => authListeners.delete(cb);
  }),
  // Helper to simulate auth state changes in tests
  __emit: _emit,
  __clearListeners: () => authListeners.clear(),
};

export const mockDb = {
  // Add mock firestore functions here as needed
};

export const mockFunctions = {
  // Add mock functions here as needed
};
