import { vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

// Minimal mocks for Firebase SDK used in unit tests
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({})),
}));

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({} as unknown as import('firebase/auth').Auth)),
  initializeAuth: vi.fn(() => ({} as unknown as import('firebase/auth').Auth)),
  indexedDBLocalPersistence: {},
  browserLocalPersistence: {},
  connectAuthEmulator: vi.fn(),
  onAuthStateChanged: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock('firebase/functions', () => ({
  getFunctions: vi.fn(() => ({} as unknown as import('firebase/functions').Functions)),
  connectFunctionsEmulator: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({} as unknown as import('firebase/firestore').Firestore)),
  initializeFirestore: vi.fn(() => ({} as unknown as import('firebase/firestore').Firestore)),
  persistentLocalCache: vi.fn(() => ({})),
  connectFirestoreEmulator: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  onSnapshot: vi.fn(),
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  doc: vi.fn(),
}));
