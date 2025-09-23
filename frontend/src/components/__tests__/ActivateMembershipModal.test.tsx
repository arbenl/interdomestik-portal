import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders, userEvent } from '@/test-utils';
import ActivateMembershipModal from '../ActivateMembershipModal';
import { describe, it, expect, vi } from 'vitest';

describe('ActivateMembershipModal', () => {
  it('submits and calls onSuccess', async () => {
    const onClose = vi.fn();
    const onSuccess = vi.fn();
    const startMembershipMock = vi.fn().mockResolvedValue({ ok: true });
    __setFunctionsResponse(async (name: string, payload: any) => {
      if (name === 'startMembership') return startMembershipMock(payload);
    });

    renderWithProviders(
      <ActivateMembershipModal
        user={{ id: 'u1', email: 'member@example.com' }}
        onClose={onClose}
        onSuccess={onSuccess}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /activate/i }));

    await waitFor(() => {
      expect(startMembershipMock).toHaveBeenCalledWith(expect.objectContaining({
        uid: 'u1',
        year: new Date().getFullYear(),
      }));
    });

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});
