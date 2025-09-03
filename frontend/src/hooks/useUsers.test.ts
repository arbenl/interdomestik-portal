import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useUsers } from './useUsers';
import { getDocs } from 'firebase/firestore';

describe('useUsers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return loading state initially', () => {
    const { result } = renderHook(() => useUsers());
    expect(result.current.loading).toBe(true);
  });

  it('should return users on successful fetch', async () => {
    const mockUsers = [
      { id: '1', name: 'User A' },
      { id: '2', name: 'User B' },
    ];
    const mockDocs = mockUsers.map(user => ({ id: user.id, data: () => user }));
    (getDocs as vi.Mock).mockResolvedValue({ docs: mockDocs });

    const { result } = renderHook(() => useUsers());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.users).toEqual(mockUsers);
      expect(result.current.error).toBeNull();
    });
  });

  it('should return an error if fetching fails', async () => {
    const mockError = new Error('Failed to fetch');
    (getDocs as vi.Mock).mockRejectedValue(mockError);

    const { result } = renderHook(() => useUsers());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toEqual(mockError);
    });
  });
});
