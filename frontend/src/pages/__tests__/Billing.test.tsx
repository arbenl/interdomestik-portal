import { renderWithProviders, screen, waitFor } from '@/test-utils';
import { vi, type Mock } from 'vitest';
import Billing from '../Billing';
import { useAuth } from '@/context/auth';
import { useMemberProfile } from '@/hooks/useMemberProfile';
import { useInvoices } from '@/hooks/useInvoices';

vi.mock('@/context/auth');
vi.mock('@/hooks/useMemberProfile');
vi.mock('@/hooks/useInvoices');

describe('Billing page', () => {
  it('renders headings and actions', async () => {
    (useAuth as Mock).mockReturnValue({ user: { uid: 'test-uid' } });
    (useMemberProfile as Mock).mockReturnValue({ data: { name: 'Test User' }, isLoading: false, error: null });
    (useInvoices as Mock).mockReturnValue({ data: [], isLoading: false, error: null });
    renderWithProviders(<Billing />);
    await waitFor(() => {
      expect(screen.getByText('Billing & Subscription')).toBeInTheDocument();
    });
  });
});