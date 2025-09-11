import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ToastProvider } from '../../ui/Toast';
import PaymentElementBox from '../PaymentElementBox';

describe('PaymentElementBox', () => {
  it('shows emulator notice when no publishable key', () => {
    render(
      <ToastProvider>
        <PaymentElementBox amountCents={2500} currency="EUR" />
      </ToastProvider>
    );
    expect(screen.getByText(/Payments \(emulator\)/i)).toBeInTheDocument();
  });
});
