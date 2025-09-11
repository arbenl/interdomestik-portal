import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ToastProvider } from '../../ui/Toast';
import PaymentElementBox from '../PaymentElementBox';

vi.mock('firebase/functions', async (importOriginal) => {
  const actual = await importOriginal<typeof import('firebase/functions')>();
  return {
    ...actual,
    getFunctions: vi.fn(() => ({} as unknown as import('firebase/functions').Functions)),
    httpsCallable: () => vi.fn().mockResolvedValue({ data: { ok: true, clientSecret: 'cs_test' } }),
  };
});

describe('PaymentElementBox confirm flow', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_STRIPE_PUBLISHABLE_KEY', 'pk_test_123');
    (window as any).Stripe = () => ({
      elements: () => ({ create: () => ({ mount: () => {} }) }),
      confirmPayment: async () => ({ paymentIntent: { status: 'succeeded' } })
    });
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });
  it('confirms payment and shows success', async () => {
    render(
      <ToastProvider>
        <PaymentElementBox amountCents={2500} currency="EUR" />
      </ToastProvider>
    );
    // Start card flow
    fireEvent.click(await screen.findByRole('button', { name: /Start Card Payment/i }));
    // Confirm payment
    fireEvent.click(await screen.findByRole('button', { name: /Confirm Payment/i }));
    const successMsgs = await screen.findAllByText(/Payment succeeded/i);
    expect(successMsgs.length).toBeGreaterThan(0);
  });
});
