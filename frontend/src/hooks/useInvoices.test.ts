import { describe, it, expect, vi, type Mock } from 'vitest';
import { renderHookWithProviders, waitFor } from '@/test-utils';
import { useInvoices } from './useInvoices';
import { getInvoices } from '../services/member';

vi.mock('../services/member');

describe('useInvoices', () => {
  it('returns invoices for a given uid', async () => {
    (getInvoices as Mock).mockResolvedValue([{ id: 'inv_1', amount: 2500 }]);
    const { result } = renderHookWithProviders(() => useInvoices('test-uid'));
    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });
    expect(result.current.data).toEqual([{ id: 'inv_1', amount: 2500 }]);
  });
});
