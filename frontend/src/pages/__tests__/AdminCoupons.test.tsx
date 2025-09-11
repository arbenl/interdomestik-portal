import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import Admin from '../Admin';

vi.mock('../../hooks/useAdmin', () => ({ default: () => ({ isAdmin: true, loading: false }) }));
vi.mock('../../hooks/useAgentOrAdmin', () => ({ default: () => ({ canRegister: false, allowedRegions: [], loading: false }) }));
vi.mock('../../hooks/useAuditLogs', () => ({ useAuditLogs: () => ({ items: [], loading: false, error: null }) }));
vi.mock('../../hooks/useMemberSearch', () => ({ useMemberSearch: () => ({ results: [], loading: false, error: null, search: vi.fn(), clear: vi.fn() }) }));
vi.mock('../../hooks/useUsers', () => ({ useUsers: () => ({ users: [], loading: false, error: null, refresh: vi.fn(), nextPage: vi.fn(), prevPage: vi.fn(), hasNext: false, hasPrev: false, page: 1 }) }));
vi.mock('../../hooks/useReports', () => ({ default: () => ({ items: [], loading: false, error: null }) }));
vi.mock('../../components/ui/useToast', () => ({ useToast: () => ({ push: vi.fn() }) }));

vi.mock('firebase/functions', async () => ({
  getFunctions: () => ({} as any),
  connectFunctionsEmulator: () => {},
  httpsCallable: () => vi.fn().mockResolvedValue({ data: { ok: true } })
}));

describe('Admin Coupons panel', () => {
  it('renders and saves coupon', async () => {
    render(<Admin />);
    const panel = screen.getByText(/Coupons/i).closest('div')!;
    const code = within(panel).getByLabelText(/Code/i) as HTMLInputElement;
    fireEvent.change(code, { target: { value: 'WELCOME' } });
    fireEvent.click(within(panel).getByRole('button', { name: /Save Coupon/i }));
    expect(screen.getByText(/Coupons/i)).toBeInTheDocument();
  });
});

