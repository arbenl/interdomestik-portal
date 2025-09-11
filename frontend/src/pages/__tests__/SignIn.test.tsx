import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ToastProvider } from '../../components/ui/Toast';
import { describe, it } from 'vitest';
import SignIn from '../SignIn';

describe('SignIn page', () => {
  it('renders sign-in form', () => {
    render(
      <MemoryRouter>
        <ToastProvider>
          <SignIn />
        </ToastProvider>
      </MemoryRouter>
    );
    expect(screen.getByRole('heading', { name: /Sign In/i })).toBeInTheDocument();
  });
});
import { describe, it, expect } from 'vitest';
