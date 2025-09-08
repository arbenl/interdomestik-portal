import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useDirectory } from './useDirectory';
import { getDocs } from 'firebase/firestore';

describe('useDirectory', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns members list', async () => {
    const docs = [
      { id: 'u1', data: () => ({ name: 'A', region: 'PRISHTINA' }) },
      { id: 'u2', data: () => ({ name: 'B', region: 'PEJA' }) },
    ];
    (getDocs as vi.Mock).mockResolvedValue({ docs });
    const { result } = renderHook(() => useDirectory(2));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.members).toHaveLength(2);
  });

  it('handles empty list', async () => {
    (getDocs as vi.Mock).mockResolvedValue({ docs: [] });
    const { result } = renderHook(() => useDirectory(2));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.members).toEqual([]);
  });

  it('handles errors', async () => {
    const err = new Error('boom');
    (getDocs as vi.Mock).mockRejectedValue(err);
    const { result } = renderHook(() => useDirectory(2));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe(err);
  });
});

