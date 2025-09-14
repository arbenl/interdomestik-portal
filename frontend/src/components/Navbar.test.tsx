import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen, fireEvent } from '@/test-utils';
import Navbar from './Navbar';
import { useAuth } from '../context/auth';

vi.mock('../context/auth');

describe('Navbar', () => {
  it('renders links and toggles user menu', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { displayName: 'Test User' } as any,
      isAdmin: false,
      isAgent: false,
      allowedRegions: [],
      loading: false,
    });

    renderWithProviders(<Navbar />);

    // Open menu
    const avatarBtn = screen.getByRole('button');
    fireEvent.click(avatarBtn);
    expect(screen.getByText('History')).toBeInTheDocument();
  });
});
