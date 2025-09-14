import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen, fireEvent, waitFor } from '@/test-utils';
import ActivateMembershipModal from './ActivateMembershipModal';

vi.mock('firebase/functions', () => ({
  getFunctions: () => ({} as unknown as import('firebase/functions').Functions),
  httpsCallable: () => vi.fn().mockResolvedValue({ data: { ok: true } }),
  connectFunctionsEmulator: vi.fn(),
}));

describe('ActivateMembershipModal', () => {
  it('submits and calls onSuccess', async () => {
    const onClose = vi.fn();
    const onSuccess = vi.fn();
    renderWithProviders(
      <ActivateMembershipModal
        user={{ id: 'u1', email: 'member@example.com' }}
        onClose={onClose}
        onSuccess={onSuccess}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /activate/i }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});
