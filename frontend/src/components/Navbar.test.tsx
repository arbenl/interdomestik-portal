import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen, fireEvent } from '@/test-utils';
import Navbar from './Navbar';
import { useAuth } from '@/hooks/useAuth';
import type { User } from 'firebase/auth';

vi.mock('../context/AuthProvider');
vi.mock('@/hooks/useAuth');
const originalFlag = import.meta.env.VITE_FF_DASHBOARD ?? 'true';

function setDashboardFlag(value: 'true' | 'false') {
  (import.meta.env as Record<string, string>).VITE_FF_DASHBOARD = value;
}

describe('Navbar', () => {
  it('renders links and toggles user menu', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { displayName: 'Test User' } as User,
      isAdmin: false,
      isAgent: false,
      allowedRegions: [],
      loading: false,
      mfaEnabled: false,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOutUser: vi.fn(),
    });

    renderWithProviders(<Navbar />);

    // Open menu
    const avatarBtn = screen.getByRole('button', { name: /Hi, Test User/i });
    fireEvent.click(avatarBtn);
    expect(screen.getByText('History')).toBeInTheDocument();
  });

  it('renders dashboard link when feature flag enabled', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isAdmin: false,
      isAgent: false,
      allowedRegions: [],
      loading: false,
      mfaEnabled: false,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOutUser: vi.fn(),
    });

    setDashboardFlag('true');
    renderWithProviders(<Navbar />);
    expect(
      screen.getByRole('link', { name: /Dashboard/i })
    ).toBeInTheDocument();
  });

  it('hides dashboard link when feature flag disabled', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isAdmin: false,
      isAgent: false,
      allowedRegions: [],
      loading: false,
      mfaEnabled: false,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOutUser: vi.fn(),
    });

    setDashboardFlag('false');
    renderWithProviders(<Navbar />);
    expect(
      screen.queryByRole('link', { name: /Dashboard/i })
    ).not.toBeInTheDocument();
  });
});
