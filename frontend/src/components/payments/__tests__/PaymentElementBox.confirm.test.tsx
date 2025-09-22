import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderWithProviders, screen, fireEvent } from '@/test-utils';
import { ToastProvider } from '../../ui/Toast';
import PaymentElementBox from '../PaymentElementBox';

describe('PaymentElementBox confirm flow', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_STRIPE_PUBLISHABLE_KEY', 'pk_test_123');
    __setFunctionsResponse(async (name: string, _payload: any) => {
      if (name === 'createPaymentIntent') return { clientSecret: 'cs_test_123' };
      return {};
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
    const startButton = await screen.findByRole('button', { name: /Start Card Payment/i });
    fireEvent.click(startButton);

    // Wait for the async operation to complete and the confirm button to appear
    const confirmButton = await screen.findByRole('button', { name: /Confirm Payment/i });
    fireEvent.click(confirmButton);

    const successMsgs = await screen.findAllByText(/Payment succeeded/i);
    expect(successMsgs.length).toBeGreaterThan(0);
  });
});
