
import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/test-utils';
import MemberPortal from './MemberPortal';
import { useAuth } from '@/hooks/useAuth';
import { makeUser } from '@/tests/factories/user';

vi.mock('@/hooks/useAuth');

describe('MemberPortal', () => {
  it('asks unauthenticated users to sign in', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: false,
      isAdmin: false,
      isAgent: false,
      allowedRegions: [],
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOutUser: vi.fn(),
    });
    renderWithProviders(<MemberPortal />);
    expect(screen.getByText(/Please sign in/i)).toBeInTheDocument();
  });

  it('renders main portal sections for signed-in user', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: makeUser({ displayName: 'Member One' }),
      loading: false,
      isAdmin: false,
      isAgent: false,
      allowedRegions: [],
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOutUser: vi.fn(),
    });
    renderWithProviders(<MemberPortal />);
    await waitFor(() => expect(screen.getByText(/Welcome, Member One/i)).toBeInTheDocument());
  });
});
