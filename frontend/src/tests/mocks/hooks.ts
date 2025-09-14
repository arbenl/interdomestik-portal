import { vi } from 'vitest';

vi.mock('@/hooks/useUsers', () => ({
  useUsers: vi.fn(() => ({
    users: [],
    loading: false,
    error: null,
    refresh: vi.fn(),
    nextPage: vi.fn(),
    prevPage: vi.fn(),
    hasNext: false,
    hasPrev: false,
    page: 1,
    setRegionFilter: vi.fn(),
    setStatusFilter: vi.fn(),
    setExpiringSoon: vi.fn(),
  })),
}));

vi.mock('@/context/auth', () => ({
  useAuth: () => ({
    loading: false,
    isAdmin: true,
    isAgent: false,
    user: { uid: 'u1', email: 'admin@example.com' },
  }),
}));
