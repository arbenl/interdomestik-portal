import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderWithProviders, screen, fireEvent } from '@/test-utils';
import { ToastProvider } from '../../ui/Toast';
import PaymentElementBox from '../PaymentElementBox';

vi.mock('firebase/functions', async (importOriginal) => {
  const actual = await importOriginal<typeof import('firebase/functions')>();
  return {
    ...actual,
    getFunctions: vi.fn(() => ({} as unknown as import('firebase/functions').Functions)),
    httpsCallable: vi.fn(() => vi.fn().mockResolvedValue({ data: { ok: true, clientSecret: 'cs_test' } })),
  };
});

describe('PaymentElementBox confirm flow', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_STRIPE_PUBLISHABLE_KEY', 'pk_test_123');
    window.Stripe = () => ({
      elements: () => ({ create: () => ({ mount: () => {} }) }),
      confirmPayment: async () => ({ paymentIntent: { status: 'succeeded' } }),
    });
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });
  it('confirms payment and shows success', async () => {
    renderWithProviders(
      <ToastProvider>
        <PaymentElementBox amountCents={2500} currency="EUR" />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: /Start Card Payment/i }));

    // Wait for the async operation to complete and the confirm button to appear
    const confirmButton = await screen.findByRole('button', { name: /Confirm Payment/i });
    fireEvent.click(confirmButton);

    const successMsgs = await screen.findAllByText(/Payment succeeded/i);
    expect(successMsgs.length).toBeGreaterThan(0);
  });
});
