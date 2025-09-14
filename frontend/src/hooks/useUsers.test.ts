import { renderHookWithProviders, waitFor } from '@/test-utils';
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { useUsers } from './useUsers';
import { getDocs } from 'firebase/firestore';
import { useAuth } from '../context/auth';

vi.mock('firebase/firestore');
vi.mock('../context/auth');

describe('useUsers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as Mock).mockReturnValue({
      allowedRegions: ['PRISHTINA'],
    });
  });

  it('should return loading state initially', () => {
    const { result } = renderHookWithProviders(() => useUsers({ allowedRegions: ['PRISHTINA'], region: 'all', status: 'all', expiringDays: null, limit: 10 }));
    expect(result.current.isLoading).toBe(true);
  });

  it('should return users on successful fetch', async () => {
    const mockUsers = [
      { id: '1', name: 'User A' },
      { id: '2', name: 'User B' },
    ];
    const mockDocs = mockUsers.map(user => ({ id: user.id, data: () => user }));
    (getDocs as Mock).mockResolvedValue({ docs: mockDocs });

    const { result } = renderHookWithProviders(() => useUsers({ allowedRegions: ['PRISHTINA'], region: 'all', status: 'all', expiringDays: null, limit: 10 }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.data?.pages[0].users).toEqual(mockUsers);
    expect(result.current.error).toBeNull();
  });

  it('should return an error if fetching fails', async () => {
    const mockError = new Error('Failed to fetch');
    (getDocs as Mock).mockRejectedValue(mockError);

    const { result } = renderHookWithProviders(() => useUsers({ allowedRegions: ['PRISHTINA'], region: 'all', status: 'all', expiringDays: null, limit: 10 }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toEqual(mockError);
    });
  });
});