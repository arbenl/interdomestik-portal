import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useMembershipHistory } from './useMembershipHistory';
import { getDocs } from 'firebase/firestore';

describe('useMembershipHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return loading state initially', () => {
    const { result } = renderHook(() => useMembershipHistory('test-uid'));
    expect(result.current.loading).toBe(true);
  });

  it('should return membership history on successful fetch', async () => {
    const mockHistory = [
      { id: '1', year: 2023, status: 'expired' },
      { id: '2', year: 2024, status: 'active' },
    ];
    const mockDocs = mockHistory.map(item => ({ id: item.id, data: () => item }));
    (getDocs as vi.Mock).mockResolvedValue({ docs: mockDocs });

    const { result } = renderHook(() => useMembershipHistory('test-uid'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.history).toEqual(mockHistory);
      expect(result.current.error).toBeNull();
    });
  });

  it('should return an error if fetching fails', async () => {
    const mockError = new Error('Failed to fetch');
    (getDocs as vi.Mock).mockRejectedValue(mockError);

    const { result } = renderHook(() => useMembershipHistory('test-uid'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toEqual(mockError);
    });
  });

  it('should handle no membership history', async () => {
    (getDocs as vi.Mock).mockResolvedValue({ docs: [] });

    const { result } = renderHook(() => useMembershipHistory('test-uid'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.history).toEqual([]);
    });
  });
});
