/* eslint-disable react-refresh/only-export-components */
import React from 'react';
import { vi } from 'vitest';

const confirmPayment = vi
  .fn()
  .mockResolvedValue({ error: null, paymentIntent: { status: 'succeeded' } });

export const __stripeMocks__ = { confirmPayment };

export function __resetStripeMocks() {
  confirmPayment.mockClear();
}

export const Elements = ({ children }: { children: React.ReactNode }) => (
  <>{children}</>
);
export const useStripe = () => ({ confirmPayment });
export const useElements = () => ({
  getElement: () => ({}),
});
export const PaymentElement = (props: React.ComponentProps<'div'>) => (
  <div data-testid="payment-element" {...props} />
);
