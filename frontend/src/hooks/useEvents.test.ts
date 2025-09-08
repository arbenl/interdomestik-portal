import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useEvents } from './useEvents';
import { getDocs } from 'firebase/firestore';

describe('useEvents', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns events list', async () => {
    const docs = [
      { id: 'e1', data: () => ({ title: 'Welcome', startAt: { seconds: 1 }, location: 'PRISHTINA' }) },
    ];
    (getDocs as vi.Mock).mockResolvedValue({ docs });
    const { result } = renderHook(() => useEvents(5));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.events).toHaveLength(1);
  });

  it('handles empty list', async () => {
    (getDocs as vi.Mock).mockResolvedValue({ docs: [] });
    const { result } = renderHook(() => useEvents(5));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.events).toEqual([]);
  });

  it('handles errors', async () => {
    const err = new Error('boom');
    (getDocs as vi.Mock).mockRejectedValue(err);
    const { result } = renderHook(() => useEvents(5));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe(err);
  });
});

