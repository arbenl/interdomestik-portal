import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, fireEvent, waitFor, screen } from '@/test-utils';
import Profile from '../Profile';
import { useAuth } from '@/hooks/useAuth';
import { useMemberProfile } from '@/hooks/useMemberProfile';
import { useHttpsCallable } from '@/hooks/useHttpsCallable';
import { makeUser } from '@/tests/factories/user';

vi.mock('@/hooks/useAuth');
vi.mock('@/hooks/useMfaPreference', () => ({
  __esModule: true,
  default: () => ({ mfaEnabled: true, setMfaPreference: vi.fn(), updating: false }),
  useMfaPreference: () => ({ mfaEnabled: true, setMfaPreference: vi.fn(), updating: false }),
}));
vi.mock('@/hooks/useMemberProfile');
vi.mock('@/hooks/useHttpsCallable');

describe('Profile page', () => {
  it('updates profile successfully', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: makeUser(),
      loading: false,
      isAdmin: false,
      isAgent: false,
      allowedRegions: [],
      mfaEnabled: false,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOutUser: vi.fn(),
    });
    const refetch = vi.fn();
    vi.mocked(useMemberProfile).mockReturnValue({ data: { name: 'User One', region: 'PRISHTINA', phone: '' }, isLoading: false, error: null, refetch } as any);
    const callFunction = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useHttpsCallable).mockReturnValue({ data: null, loading: false, error: null, callFunction, reset: vi.fn() } as any);
    renderWithProviders(<Profile />);
    const nameInput = screen.getByLabelText(/^Name$/i);
    fireEvent.change(nameInput, { target: { value: 'User One Updated' } });
    fireEvent.click(screen.getByRole('button', { name: /Update Profile/i }));
    await waitFor(() => {
      expect(callFunction).toHaveBeenCalledWith({ name: 'User One Updated', phone: '', region: 'PRISHTINA' });
    });
  });
});
