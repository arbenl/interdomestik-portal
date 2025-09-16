

import { describe, it, expect, vi, type Mock } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/test-utils';
import MemberPortal from './MemberPortal';
import { useAuth } from '@/hooks/useAuth';

vi.mock('@/context/AuthProvider');

describe('MemberPortal', () => {
  it('asks unauthenticated users to sign in', () => {
    (useAuth as Mock).mockReturnValue({ user: null });
    renderWithProviders(<MemberPortal />);
    expect(screen.getByText(/Please sign in/i)).toBeInTheDocument();
  });

  it('renders main portal sections for signed-in user', async () => {
    (useAuth as Mock).mockReturnValue({
      user: { uid: 'test-uid', displayName: 'Member One' },
    });
    renderWithProviders(<MemberPortal />);
    await waitFor(() => expect(screen.getByText(/Welcome, Member One/i)).toBeInTheDocument());
  });
});
