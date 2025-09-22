import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useEvents } from './useEvents';
import { renderHookWithProviders, waitFor } from '@/test-utils';


describe('useEvents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns events list', async () => {
    const mockEvents = [
      { id: 'evt1', title: 'Spring Fair', startsAt: 1700000000000 },
    ];
    __setFunctionsResponse((_name: string, _payload: any) => mockEvents);
    const { result } = renderHookWithProviders(() => useEvents(5));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual(mockEvents);
  });

  it('handles empty list', async () => {
    __setFunctionsResponse(() => []);
    const { result } = renderHookWithProviders(() => useEvents(5));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual([]);
  });

  it('handles errors', async () => {
    __setFunctionsResponse(() => { throw new Error('boom'); });
    const { result } = renderHookWithProviders(() => useEvents(5));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeTruthy();
  });
});