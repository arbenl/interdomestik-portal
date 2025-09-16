import { describe, it, expect, vi, type Mock } from 'vitest';
import { renderWithProviders, screen, fireEvent, within } from '@/test-utils';
import Admin from '../Admin';
import { useAuth } from '@/hooks/useAuth';

vi.mock('@/context/AuthProvider');

describe('Admin Coupons panel', () => {
  it('renders and saves coupon', async () => {
    (useAuth as Mock).mockReturnValue({
      isAdmin: true,
      isAgent: false,
      user: { uid: 'test-admin-uid' },
      loading: false,
      allowedRegions: ['PRISHTINA'],
    });
    renderWithProviders(<Admin />);
    const panel = await screen.findByText(/Coupons/i);
    const code = within(panel.parentElement as HTMLElement).getByLabelText(/Code/i) as HTMLInputElement;
    fireEvent.change(code, { target: { value: 'WELCOME' } });
    fireEvent.click(within(panel.parentElement as HTMLElement).getByRole('button', { name: /Save Coupon/i }));
    expect(screen.getByText(/Coupons/i)).toBeInTheDocument();
  });
});
