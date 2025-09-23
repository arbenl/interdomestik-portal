
import { describe, it, expect, vi } from 'vitest';
import type { ReactNode } from 'react';
import { renderWithProviders, screen, waitFor } from '@/test-utils';
import MemberPortal from './MemberPortal';
import { useAuth } from '@/hooks/useAuth';
import { makeUser } from '@/tests/factories/user';

vi.mock('@/hooks/useAuth');
vi.mock('../components/ui/PanelBoundary', () => ({
  __esModule: true,
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock('../features/portal/ProfilePanel', () => ({
  ProfilePanel: () => <div data-testid="profile-panel">Profile Panel</div>,
}));
vi.mock('../features/portal/MembershipPanel', () => ({
  MembershipPanel: () => <div data-testid="membership-panel">Membership Panel</div>,
}));
vi.mock('../features/portal/BillingPanel', () => ({
  BillingPanel: () => <div data-testid="billing-panel">Billing Panel</div>,
}));

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
    await waitFor(() => expect(screen.getByTestId('profile-panel')).toBeInTheDocument());
    expect(screen.getByTestId('membership-panel')).toBeInTheDocument();
    expect(screen.getByTestId('billing-panel')).toBeInTheDocument();
  });
});
