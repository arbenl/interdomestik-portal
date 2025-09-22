import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen, fireEvent, waitFor } from '@/test-utils';
import Profile from '../Profile';
import { useAuth } from '@/hooks/useAuth';
import { useMemberProfile } from '@/hooks/useMemberProfile';
import { makeUser } from '@/tests/factories/user';

vi.mock('@/hooks/useAuth');
vi.mock('@/hooks/useMemberProfile');

describe('Profile page', () => {
  it('updates profile successfully', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: makeUser(),
      loading: false,
      isAdmin: false,
      isAgent: false,
      allowedRegions: [],
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOutUser: vi.fn(),
    });
    const mutate = vi.fn();
    vi.mocked(useMemberProfile).mockReturnValue({ data: { name: 'User One' }, isLoading: false, error: null, mutate } as any);
    renderWithProviders(<Profile />);
    const nameInput = screen.getByLabelText(/Name/i);
    fireEvent.change(nameInput, { target: { value: 'User One Updated' } });
    fireEvent.click(screen.getByRole('button', { name: /Update Profile/i }));
    await waitFor(() => {
      expect(mutate).toHaveBeenCalledWith({ name: 'User One Updated' });
    });
  });
});