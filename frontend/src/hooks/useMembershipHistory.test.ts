import { renderHookWithProviders, waitFor } from '@/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useMembershipHistory } from './useMembershipHistory';
import { setFirestoreSnapshotEmitter } from '@/tests/mocks/firestore.setup';
import { QueryDocumentSnapshot } from 'firebase/firestore';

describe('useMembershipHistory', () => {
  const uid = 'test-uid';
  const historyKey = `users/${uid}/membershipHistory`;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return loading state initially', () => {
    const { result } = renderHookWithProviders(() => useMembershipHistory(uid));
    expect(result.current.isLoading).toBe(true);
  });

  it('should return membership history on successful fetch', async () => {
    const mockHistory = [
      { id: '1', year: 2023, status: 'expired' },
      { id: '2', year: 2024, status: 'active' },
    ];
    const mockDocs = mockHistory.map(item => ({ id: item.id, data: () => item })) as unknown as QueryDocumentSnapshot[];

    setFirestoreSnapshotEmitter(historyKey, (next) => {
      next({ docs: mockDocs, size: mockDocs.length, empty: false });
    });

    const { result } = renderHookWithProviders(() => useMembershipHistory(uid));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toEqual(mockHistory);
      expect(result.current.error).toBeNull();
    });
  });

  it('should return an error if fetching fails', async () => {
    const mockError = new Error('Failed to fetch');
    setFirestoreSnapshotEmitter(historyKey, (_next, error) => {
      error(mockError);
    });

    const { result } = renderHookWithProviders(() => useMembershipHistory(uid));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toEqual(mockError);
    });
  });

  it('should handle no membership history', async () => {
    setFirestoreSnapshotEmitter(historyKey, (next) => {
      next({ docs: [], size: 0, empty: true });
    });

    const { result } = renderHookWithProviders(() => useMembershipHistory(uid));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toEqual([]);
    });
  });
});