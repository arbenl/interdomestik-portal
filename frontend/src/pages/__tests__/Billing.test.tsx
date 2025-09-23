import { renderWithProviders, screen, waitFor } from '@/test-utils';
import { vi, type Mock, describe, it, expect } from 'vitest';
import Billing from '../Billing';
import { useAuth } from '@/hooks/useAuth';
import { useMemberProfile } from '@/hooks/useMemberProfile';
import { useInvoices } from '@/hooks/useInvoices';

vi.mock('@/context/AuthProvider');
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