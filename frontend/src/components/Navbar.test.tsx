import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen, fireEvent } from '@/test-utils';
import Navbar from './Navbar';
import { useAuth } from '@/hooks/useAuth';
import type { User } from 'firebase/auth';

vi.mock('../context/AuthProvider');
vi.mock('@/hooks/useAuth');

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
});
