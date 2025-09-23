import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders, userEvent } from '@/test-utils';
import AgentRegistrationCard from '../AgentRegistrationCard';
import { describe, it, expect, vi } from 'vitest';

describe('AgentRegistrationCard', () => {
  it('submits with valid data and calls onSuccess', async () => {
    const onSuccess = vi.fn();
    const onError = vi.fn();
    const agentCreateMemberMock = vi.fn().mockResolvedValue({ ok: true });
    __setFunctionsResponse(async (name: string) => {
      if (name === 'agentCreateMember') return agentCreateMemberMock();
    });

    renderWithProviders(
      <AgentRegistrationCard allowedRegions={['PRISHTINA']} onSuccess={onSuccess} onError={onError} />,
    );
    await userEvent.type(screen.getByPlaceholderText(/Email/i), 'new@example.com');
    await userEvent.type(screen.getByPlaceholderText(/Full name/i), 'New User');
    await userEvent.selectOptions(screen.getByRole('combobox'), 'PRISHTINA');
    await userEvent.click(screen.getByRole('button', { name: /Register Member/i }));

    await waitFor(() => {
      expect(agentCreateMemberMock).toHaveBeenCalledWith({
        email: 'new@example.com',
        name: 'New User',
        region: 'PRISHTINA',
        phone: '',
        orgId: '',
      });
    });

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
  });
});
