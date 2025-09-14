import { renderWithProviders, screen } from '@/test-utils';
import { ToastProvider } from '../../components/ui/Toast';
import { describe, it, expect } from 'vitest';
import SignIn from '../SignIn';

describe('SignIn page', () => {
  it('renders sign-in form', () => {
    renderWithProviders(
      <ToastProvider>
        <SignIn />
      </ToastProvider>,
    );
    expect(screen.getByRole('heading', { name: /Sign In/i })).toBeInTheDocument();
  });
});
