import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen } from '@/test-utils';
import { BillingPanel } from '../BillingPanel';
import { useInvoices } from '@/hooks/useInvoices';
import { useAuth } from '@/hooks/useAuth';

vi.mock('@/hooks/useInvoices');
vi.mock('@/hooks/useAuth');

describe('BillingPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      user: { uid: 'user-1' },
      isAdmin: false,
      isAgent: false,
      allowedRegions: [],
      loading: false,
      mfaEnabled: false,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOutUser: vi.fn(),
    } as any);
  });

  it('shows loading state while invoices fetch', () => {
    vi.mocked(useInvoices).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as any);
    renderWithProviders(<BillingPanel />);
    expect(screen.getByText(/Loading invoices/i)).toBeInTheDocument();
  });

  it('renders error message when invoice query fails', () => {
    const error = new Error('network');
    vi.mocked(useInvoices).mockReturnValue({
      data: undefined,
      isLoading: false,
      error,
    } as any);
    renderWithProviders(<BillingPanel />);
    expect(screen.getByText(/Error loading invoices/i)).toHaveTextContent(
      'network'
    );
  });

  it('renders invoice rows when invoices exist', () => {
    vi.mocked(useInvoices).mockReturnValue({
      data: [
        {
          id: 'inv1',
          status: 'paid',
          amount: 123,
          created: { seconds: 1700000000 },
        },
        { id: 'inv2', status: 'due', amount: 456 },
      ],
      isLoading: false,
      error: null,
    } as any);

    renderWithProviders(<BillingPanel />);
    expect(screen.getByText('Billing')).toBeInTheDocument();
    expect(screen.getByText('paid - 123')).toBeInTheDocument();
    expect(screen.getByText('due - 456')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Manage Subscription/i })
    ).toHaveAttribute('href', '/billing');
  });

  it('shows fallback when there are no invoices', () => {
    vi.mocked(useInvoices).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as any);
    renderWithProviders(<BillingPanel />);
    expect(screen.getByText('No invoices yet.')).toBeInTheDocument();
  });
});
