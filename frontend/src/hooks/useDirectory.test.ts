import { describe, it, expect, vi, type Mock } from 'vitest';
import { renderHookWithProviders, waitFor } from '@/test-utils';
import { useDirectory } from './useDirectory';
import { getDocs } from 'firebase/firestore';

vi.mock('firebase/firestore');

describe('useDirectory', () => {
  it('returns members list', async () => {
    const docs = [
      { id: 'u1', data: () => ({ name: 'A', region: 'PRISHTINA' }) },
      { id: 'u2', data: () => ({ name: 'B', region: 'PEJA' }) },
    ];
    (getDocs as Mock).mockResolvedValue({ docs });
    const { result } = renderHookWithProviders(() => useDirectory(2));
    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });
    expect(result.current.data?.length).toBe(2);
  });
});
