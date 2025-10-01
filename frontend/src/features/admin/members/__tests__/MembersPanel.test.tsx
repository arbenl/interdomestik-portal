import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@/test-utils';
import { renderWithProviders } from '@/test-utils';
import type { Profile } from '@/types';
import { MembersPanel } from '../MembersPanel';
import { useState } from 'react';

type UseUsersResult = {
  data: { pages: { users: Profile[] }[] };
  fetchNextPage: () => void;
  hasNextPage: boolean;
  isLoading: boolean;
  error: unknown;
};

const createBaseResult = (): UseUsersResult => ({
  data: { pages: [{ users: [] }] },
  fetchNextPage: vi.fn(),
  hasNextPage: false,
  isLoading: false,
  error: null,
});

const useUsersMock = vi.fn<UseUsersResult, [unknown]>();
const membersListSpy = vi.fn();

vi.mock('@/hooks/useUsers', () => ({
  useUsers: (args: unknown) => useUsersMock(args),
}));

vi.mock('@/utils/urlState', () => ({
  useUrlState: (initialState: Record<string, unknown>) =>
    useState(initialState),
}));

vi.mock('@/components/ActivateMembershipModal', () => ({
  __esModule: true,
  default: ({ user }: { user: { id: string; email?: string | null } }) => (
    <div data-testid="activate-modal">Modal for {user.id}</div>
  ),
}));

vi.mock('../MembersList', () => ({
  MembersList: (props: any) => {
    membersListSpy(props);
    return (
      <div data-testid="members-list">
        <div data-testid="users-count">{props.users.length} users</div>
        <button
          type="button"
          onClick={() => props.onActivateClick(props.users[0])}
        >
          Activate
        </button>
        <button type="button" onClick={() => props.setExpiringSoon(true)}>
          Expiring Soon
        </button>
      </div>
    );
  },
}));

const baseResult = createBaseResult();

describe('MembersPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useUsersMock.mockImplementation(() => baseResult);
  });

  it('renders a loading indicator while members are fetching', () => {
    useUsersMock.mockReturnValue({ ...baseResult, isLoading: true });
    renderWithProviders(<MembersPanel allowedRegions={['PRISHTINA']} />);
    expect(screen.getByText(/Loading.../i)).toBeInTheDocument();
  });

  it('renders error state when query fails', () => {
    const error = new Error('boom');
    useUsersMock.mockReturnValue({ ...baseResult, error });
    renderWithProviders(<MembersPanel allowedRegions={[]} />);
    expect(screen.getByText(/Error:/i)).toHaveTextContent('boom');
  });

  it('passes members to MembersList and opens modal on activation', () => {
    const users: Profile[] = [
      { id: 'u1', email: 'user@example.com' } as Profile,
    ];
    useUsersMock.mockReturnValue({
      ...baseResult,
      data: { pages: [{ users }] },
    });

    renderWithProviders(<MembersPanel allowedRegions={['PRISHTINA']} />);
    expect(screen.getByTestId('users-count')).toHaveTextContent('1 users');

    fireEvent.click(screen.getByText('Activate'));
    expect(screen.getByTestId('activate-modal')).toBeInTheDocument();
  });

  it('updates filters when expiring soon is toggled', () => {
    const callArgs: any[] = [];
    useUsersMock.mockImplementation((args) => {
      callArgs.push(args);
      return baseResult;
    });

    renderWithProviders(<MembersPanel allowedRegions={['PRISHTINA']} />);
    fireEvent.click(screen.getByText('Expiring Soon'));

    const latest = callArgs.at(-1);
    expect(latest.expiringDays).toBe(30);
  });
});
