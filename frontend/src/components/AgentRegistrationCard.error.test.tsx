import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen, waitFor, userEvent } from '@/test-utils';
import AgentRegistrationCard from './AgentRegistrationCard';

describe('AgentRegistrationCard (error path)', () => {
  it('calls onError when callable rejects', async () => {
    const onSuccess = vi.fn();
    const onError = vi.fn();
    const rejection = new Error('Registration failed');
    __setFunctionsResponse(async (name: string) => {
      if (name === 'agentCreateMember') throw rejection;
      return {};
    });
    renderWithProviders(
      <AgentRegistrationCard allowedRegions={['PRISHTINA']} onSuccess={onSuccess} onError={onError} />,
    );
    await userEvent.type(screen.getByPlaceholderText(/Email/i), 'new@example.com');
    await userEvent.type(screen.getByPlaceholderText(/Full name/i), 'New User');
    await userEvent.selectOptions(screen.getByRole('combobox'), 'PRISHTINA');
    await userEvent.click(screen.getByRole('button', { name: /Register Member/i }));
    await waitFor(() => expect(onError).toHaveBeenCalledWith('Registration failed'));
  });
});
