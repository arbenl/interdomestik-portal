import type { UseInfiniteQueryResult } from '@tanstack/react-query';
import { describe, it, expect, vi, type Mock } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/test-utils';
import Admin from '../Admin';
import useAgentOrAdmin from '@/hooks/useAgentOrAdmin';
import * as useUsersHook from '@/hooks/useUsers';

vi.mock('@/hooks/useAgentOrAdmin');

describe('Admin page (smoke)', () => {
  it('renders the admin panel', async () => {
    (useAgentOrAdmin as Mock).mockReturnValue({
      isAdmin: true,
      canRegister: true,
      allowedRegions: ['PRISHTINA'],
      loading: false,
    });
    vi.spyOn(useUsersHook, 'useUsers').mockReturnValue({
      data: { pages: [{ users: [], nextPage: null }], pageParams: [null] },
      isLoading: false,
    } as unknown as UseInfiniteQueryResult<{
      pages: { users: never[]; nextPage: null }[];
      pageParams: (null | undefined)[];
    }>);
    renderWithProviders(<Admin />);
    await waitFor(() => {
      expect(screen.getByText('Admin Panel')).toBeInTheDocument();
    });
  });
});
