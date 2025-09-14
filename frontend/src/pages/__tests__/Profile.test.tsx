import { describe, it, expect, vi, type Mock } from 'vitest';
import { renderWithProviders, screen, fireEvent, waitFor } from '@/test-utils';
import Profile from '../Profile';
import { useAuth } from '@/context/auth';
import { useMemberProfile } from '@/hooks/useMemberProfile';

vi.mock('@/context/auth');
vi.mock('@/hooks/useMemberProfile');

describe('Profile page', () => {
  it('updates profile successfully', async () => {
    (useAuth as Mock).mockReturnValue({ user: { uid: 'test-uid' } });
    const mutate = vi.fn();
    (useMemberProfile as Mock).mockReturnValue({ data: { name: 'User One' }, isLoading: false, error: null, mutate });
    renderWithProviders(<Profile />);
    const nameInput = screen.getByLabelText(/Name/i);
    fireEvent.change(nameInput, { target: { value: 'User One Updated' } });
    fireEvent.click(screen.getByRole('button', { name: /Update Profile/i }));
    await waitFor(() => {
      expect(mutate).toHaveBeenCalledWith({ name: 'User One Updated' });
    });
  });
});