import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '@/test-utils';
import { ToastProvider } from '../../ui/Toast';
import PaymentElementBox from '../PaymentElementBox';

describe('PaymentElementBox', () => {
  it('shows emulator notice when no publishable key', () => {
    renderWithProviders(
      <ToastProvider>
        <PaymentElementBox amountCents={2500} currency="EUR" />
      </ToastProvider>,
    );
    expect(screen.getByText(/Payments \(emulator\)/i)).toBeInTheDocument();
  });
});
