import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { getDocs } from 'firebase/firestore';
import { useInvoices } from './useInvoices';

describe('useInvoices', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns empty when uid missing', async () => {
    const { result } = renderHook(() => useInvoices(undefined));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.invoices).toEqual([]);
  });

  it('returns invoices for uid', async () => {
    const docs = [
      { id: 'inv_2', data: () => ({ invoiceId: 'inv_2', amount: 5000, currency: 'EUR', status: 'paid', created: { seconds: 2, nanoseconds: 0 } }) },
      { id: 'inv_1', data: () => ({ invoiceId: 'inv_1', amount: 2500, currency: 'EUR', status: 'paid', created: { seconds: 1, nanoseconds: 0 } }) },
    ];
    (getDocs as vi.Mock).mockResolvedValue({ docs });
    const { result } = renderHook(() => useInvoices('u1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.invoices.map(i => i.invoiceId)).toEqual(['inv_2','inv_1']);
  });

  it('handles errors', async () => {
    const err = new Error('boom');
    (getDocs as vi.Mock).mockRejectedValue(err);
    const { result } = renderHook(() => useInvoices('u1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe(err);
  });
});

