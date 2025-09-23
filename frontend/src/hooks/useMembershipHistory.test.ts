import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useMembershipHistory } from './useMembershipHistory';
import { TestProviders } from '@/test-utils';

describe('useMembershipHistory', () => {
  const uid = 'test-uid';

  beforeEach(() => {
    vi.clearAllMocks();
    global.__fsClear();
  });

  it('should return loading state initially', () => {
    const { result } = renderHook(() => useMembershipHistory(uid), { wrapper: TestProviders });
    expect(result.current.isLoading).toBe(true);
  });

  it('should return membership history on successful fetch', async () => {
    const mockHistory = [
      { id: '1', year: 2023, status: 'expired' as const },
      { id: '2', year: 2024, status: 'active' as const },
    ];
    global.__fsSeedDefault(mockHistory);

    const { result } = renderHook(() => useMembershipHistory(uid), { wrapper: TestProviders });
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toEqual(mockHistory);
      expect(result.current.error).toBeNull();
    });
  });

  it('should return an error if fetching fails', async () => {
    const mockError = new Error('Failed to fetch');
    global.__fsThrowDefault(mockError);

    const { result } = renderHook(() => useMembershipHistory(uid), { wrapper: TestProviders });
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toEqual(mockError);
    });
  });

  it('should handle no membership history', async () => {
    global.__fsSeedDefault([]);

    const { result } = renderHook(() => useMembershipHistory(uid), { wrapper: TestProviders });
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toEqual([]);
    });
  });
});
