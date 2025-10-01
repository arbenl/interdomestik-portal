import { describe, it, expect, vi, type Mock } from 'vitest';
import { renderWithProviders, screen, fireEvent, waitFor } from '@/test-utils';
import { CouponsPanel } from '@/features/admin/coupons/CouponsPanel';
import { useCoupons } from '@/hooks/admin/useCoupons';

vi.mock('@/hooks/admin/useCoupons');

describe('Admin Coupons panel', () => {
  it('renders and saves coupon', async () => {
    const create = vi.fn().mockResolvedValue({ ok: true });
    (useCoupons as Mock).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      create,
    });

    const push = vi.fn();
    renderWithProviders(<CouponsPanel push={push} />);

    const code = screen.getByLabelText(/Code/i) as HTMLInputElement;
    expect(code.value).toBe('WELCOME');

    fireEvent.change(code, { target: { value: 'WELCOME2025' } });
    fireEvent.click(screen.getByRole('button', { name: /Save Coupon/i }));

    await waitFor(() => {
      expect(create).toHaveBeenCalledWith({
        code: 'WELCOME2025',
        percentOff: 0,
        amountOff: 500,
        active: true,
      });
    });
    await waitFor(() => {
      expect(push).toHaveBeenCalledWith({
        type: 'success',
        message: 'Coupon saved',
      });
    });
  });
});
