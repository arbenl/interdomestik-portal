

import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen, fireEvent, waitFor } from '@/test-utils';
import AgentRegistrationCard from './AgentRegistrationCard';

vi.mock('firebase/functions', () => ({
  getFunctions: () => ({} as unknown as import('firebase/functions').Functions),
  httpsCallable: () => vi.fn().mockResolvedValue({ data: { ok: true } }),
  connectFunctionsEmulator: vi.fn(),
}));

describe('AgentRegistrationCard', () => {
  it('submits with valid data and calls onSuccess', async () => {
    const onSuccess = vi.fn();
    const onError = vi.fn();
    renderWithProviders(
      <AgentRegistrationCard allowedRegions={['PRISHTINA']} onSuccess={onSuccess} onError={onError} />,
    );
    fireEvent.change(screen.getByPlaceholderText(/Email/i), { target: { value: 'new@example.com' } });
    fireEvent.change(screen.getByPlaceholderText(/Full name/i), { target: { value: 'New User' } });
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'PRISHTINA' } });
    fireEvent.click(screen.getByRole('button', { name: /Register Member/i }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
  });
});

