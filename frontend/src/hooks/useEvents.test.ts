import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useEvents } from './useEvents';
import { onSnapshot } from 'firebase/firestore';

describe('useEvents', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns events list', async () => {
    const docs = [
      { id: 'e1', data: () => ({ title: 'Welcome', startAt: { seconds: 1 }, location: 'PRISHTINA' }) },
    ];
    (onSnapshot as unknown as vi.Mock).mockImplementation((_q, next) => { next({ docs }); return () => {}; });
    const { result } = renderHook(() => useEvents(5));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.events).toHaveLength(1);
  });

  it('handles empty list', async () => {
    (onSnapshot as unknown as vi.Mock).mockImplementation((_q, next) => { next({ docs: [] }); return () => {}; });
    const { result } = renderHook(() => useEvents(5));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.events).toEqual([]);
  });

  it('handles errors', async () => {
    const err = new Error('boom');
    (onSnapshot as unknown as vi.Mock).mockImplementation((_q, _next, error) => { error(err); return () => {}; });
    const { result } = renderHook(() => useEvents(5));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe(err);
  });
});
