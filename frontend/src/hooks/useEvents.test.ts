import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useEvents } from './useEvents';
import { renderHookWithProviders, waitFor } from '@/test-utils';
import { setFirestoreSnapshotEmitter } from '@/tests/mocks/firestore.setup';
import { QueryDocumentSnapshot } from 'firebase/firestore';

describe('useEvents', () => {
  const eventsKey = 'q:events';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns events list', async () => {
    const mockEvents = [
      { id: 'e1', data: () => ({ title: 'Welcome', startAt: { seconds: 1 }, location: 'PRISHTINA' }) },
    ] as unknown as QueryDocumentSnapshot[];
    setFirestoreSnapshotEmitter(eventsKey, (next) => {
      next({ docs: mockEvents, size: mockEvents.length, empty: false });
    });
    const { result } = renderHookWithProviders(() => useEvents(5));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toHaveLength(1);
  });

  it('handles empty list', async () => {
    setFirestoreSnapshotEmitter(eventsKey, (next) => {
      next({ docs: [], size: 0, empty: true });
    });
    const { result } = renderHookWithProviders(() => useEvents(5));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual([]);
  });

  it('handles errors', async () => {
    const err = new Error('boom');
    setFirestoreSnapshotEmitter(eventsKey, (_next, error) => {
      error(err);
    });
    const { result } = renderHookWithProviders(() => useEvents(5));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe(err);
  });
});