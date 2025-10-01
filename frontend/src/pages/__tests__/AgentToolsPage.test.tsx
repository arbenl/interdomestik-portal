import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, fireEvent, waitFor } from '@/test-utils';
import AgentTools from '../AgentTools';
import { useAuth } from '@/hooks/useAuth';
import { useUsers } from '@/hooks/useUsers';
import { updateDoc } from 'firebase/firestore';
const refetchMock = vi.fn();

vi.mock('@/hooks/useAuth');
vi.mock('@/hooks/useUsers');
vi.mock('@/components/AgentRegistrationCard', () => ({
  __esModule: true,
  default: () => <div data-testid="agent-registration-card" />,
}));

describe('AgentTools page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      user: { uid: 'agent-1', displayName: 'Agent Smith' },
      isAdmin: false,
      isAgent: true,
      allowedRegions: ['PRISHTINA'],
      loading: false,
      mfaEnabled: true,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOutUser: vi.fn(),
    });
    vi.mocked(useUsers).mockReturnValue({
      data: {
        pages: [
          {
            users: [
              {
                id: 'u1',
                name: 'John',
                email: 'john@example.com',
                phone: '123',
                orgId: 'ORG',
                memberNo: '001',
                region: 'PRISHTINA',
              },
            ],
          },
        ],
      },
      isLoading: false,
      error: null,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      refetch: refetchMock,
    });
    refetchMock.mockReset();
  });

  it('shows unauthorized message when agent privileges are missing', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { uid: 'member-1' },
      isAdmin: false,
      isAgent: false,
      allowedRegions: [],
      loading: false,
      mfaEnabled: false,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOutUser: vi.fn(),
    } as any);
    vi.mocked(useUsers).mockReturnValue({
      isLoading: false,
      error: null,
      data: { pages: [] },
    } as any);

    renderWithProviders(<AgentTools />);
    expect(screen.getByText(/You are not authorized/i)).toBeInTheDocument();
  });

  it('renders agent members and triggers refresh', async () => {
    renderWithProviders(<AgentTools />);
    expect(screen.getByText('Agent Tools')).toBeInTheDocument();
    expect(screen.getByText('John')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Refresh'));
    expect(refetchMock).toHaveBeenCalled();
  });

  it('allows editing a member and saves via Firestore', async () => {
    renderWithProviders(<AgentTools />);

    fireEvent.click(screen.getByText('Edit'));
    fireEvent.change(screen.getByDisplayValue('John'), {
      target: { value: 'Updated' },
    });
    fireEvent.change(screen.getByDisplayValue('123'), {
      target: { value: '999' },
    });
    fireEvent.change(screen.getByDisplayValue('ORG'), {
      target: { value: 'NEWORG' },
    });

    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(updateDoc).toHaveBeenCalledWith(
        expect.objectContaining({ __path: 'members/u1' }),
        {
          name: 'Updated',
          phone: '999',
          orgId: 'NEWORG',
        }
      );
    });
    expect(refetchMock).toHaveBeenCalled();
    expect(await screen.findByText('Member updated')).toBeInTheDocument();
  });

  it('renders loading state while auth is resolving', () => {
    vi.mocked(useAuth).mockReturnValue({
      loading: true,
      isAdmin: false,
      isAgent: false,
      allowedRegions: [],
      mfaEnabled: false,
      user: null,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOutUser: vi.fn(),
    } as any);

    renderWithProviders(<AgentTools />);
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });
});
