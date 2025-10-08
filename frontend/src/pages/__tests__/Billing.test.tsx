import { renderWithProviders, screen, waitFor, fireEvent } from '@/test-utils';
import {
  vi,
  type Mock,
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
} from 'vitest';
import { act } from '@testing-library/react';
import Billing from '../Billing';
import { useAuth } from '@/hooks/useAuth';
import { useMemberProfile } from '@/hooks/useMemberProfile';
import { useInvoices } from '@/hooks/useInvoices';

const pushMock = vi.fn();
const refetchMock = vi.fn();

vi.mock('@/components/ui/useToast', () => ({
  useToast: () => ({ push: pushMock }),
}));

vi.mock('@/components/payments/PaymentElementBox', () => ({
  __esModule: true,
  default: () => <div data-testid="payment-element" />,
}));

vi.mock('@/hooks/useAuth');
vi.mock('@/hooks/useMfaPreference', () => ({
  __esModule: true,
  default: () => ({
    mfaEnabled: true,
    setMfaPreference: vi.fn(),
    updating: false,
  }),
  useMfaPreference: () => ({
    mfaEnabled: true,
    setMfaPreference: vi.fn(),
    updating: false,
  }),
}));
vi.mock('@/hooks/useMemberProfile');
vi.mock('@/hooks/useInvoices');

describe('Billing page', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    (useAuth as Mock).mockReturnValue({
      user: { uid: 'test-uid', displayName: 'Admin User' },
      isAdmin: true,
      isAgent: false,
      allowedRegions: ['PRISHTINA'],
      loading: false,
      mfaEnabled: true,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOutUser: vi.fn(),
    });
    (useMemberProfile as Mock).mockReturnValue({
      data: { name: 'Test User', expiresAt: { seconds: 1700000000 } },
      isLoading: false,
      error: null,
    });
    (useInvoices as Mock).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch: refetchMock,
    });
    pushMock.mockClear();
    refetchMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders headings and actions', async () => {
    renderWithProviders(<Billing />);
    await waitFor(() => {
      expect(screen.getByText('Billing & Subscription')).toBeInTheDocument();
    });
  });

  it('prompts unauthenticated visitors to sign in', async () => {
    (useAuth as Mock).mockReturnValue({
      user: null,
      isAdmin: false,
      isAgent: false,
      allowedRegions: [],
      loading: false,
      mfaEnabled: false,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOutUser: vi.fn(),
    });
    renderWithProviders(<Billing />);
    expect(screen.getByText(/Please sign in/i)).toBeInTheDocument();
    expect(screen.queryByTestId('payment-element')).not.toBeInTheDocument();
  });

  it('simulates a payment successfully', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);
    vi.useFakeTimers();

    renderWithProviders(<Billing />);
    const button = screen.getByRole('button', {
      name: /Add test paid invoice/i,
    });
    await act(async () => {
      fireEvent.click(button);
      await vi.runAllTimersAsync();
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:5001/interdomestik-dev/europe-west1/stripeWebhook',
      expect.any(Object)
    );
    expect(refetchMock).toHaveBeenCalled();
    expect(pushMock).toHaveBeenCalledWith({
      type: 'success',
      message: 'Payment recorded. Membership activated.',
    });

    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('surfaces errors when the payment simulation fails', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 503 });
    vi.stubGlobal('fetch', fetchMock);

    renderWithProviders(<Billing />);
    const button = screen.getByRole('button', {
      name: /Add test paid invoice/i,
    });
    await act(async () => {
      fireEvent.click(button);
    });

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith({
        type: 'error',
        message: 'Failed to simulate payment',
      });
    });
    expect(refetchMock).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('renders invoice rows with formatted amounts', async () => {
    (useInvoices as Mock).mockReturnValue({
      data: [
        {
          id: 'inv1',
          amount: 1234,
          currency: 'XYZ',
          status: 'paid',
          created: { seconds: 1700000000 },
        },
      ],
      isLoading: false,
      error: null,
      refetch: refetchMock,
    });

    renderWithProviders(<Billing />);
    expect(await screen.findByText('inv1')).toBeInTheDocument();
    expect(screen.getByText(/XYZ\s?12\.34/)).toBeInTheDocument();
  });
});
