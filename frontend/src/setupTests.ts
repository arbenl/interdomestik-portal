import { vi } from 'vitest';

vi.mock('firebase/firestore', () => ({
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  doc: vi.fn(),
}));
