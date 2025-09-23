import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useEvents } from './useEvents';
import { renderHookWithProviders, waitFor } from '@/test-utils';


describe('useEvents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns events list', async () => {
    const mockEvents = [
      { id: 'evt1', title: 'Spring Fair', startAt: { seconds: 1_700_000_000 } },
    ];
    __fsSeed('events', mockEvents);
    const { result } = renderHookWithProviders(() => useEvents(5));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual(mockEvents);
  });

  it('handles empty list', async () => {
    __fsSeed('events', []);
    const { result } = renderHookWithProviders(() => useEvents(5));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual([]);
  });

  it('handles errors', async () => {
    __fsThrow(new Error('boom'));
    const { result } = renderHookWithProviders(() => useEvents(5));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeTruthy();
  });
});
