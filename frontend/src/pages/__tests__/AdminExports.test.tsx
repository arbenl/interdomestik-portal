import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  renderWithProviders,
  screen,
  within,
  fireEvent,
  waitFor,
} from '@/test-utils';
import { ExportsPanel } from '@/features/admin/exports/ExportsPanel';

const pushMock = vi.fn();
const useAuthMock = vi.fn();
vi.mock('@/components/ui/useToast', () => ({
  useToast: () => ({ push: pushMock }),
}));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => useAuthMock() }));

const seededExports = Array.from({ length: 6 }, (_, index) => ({
  id: `exp${index + 1}`,
  type: 'members',
  status: index === 0 ? 'running' : 'done',
  startedAt: 1700000000000 - index * 1000,
}));

describe('Admin Exports panel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pushMock.mockReset();
    global.__fsSeed('exports', seededExports);
    useAuthMock.mockReturnValue({
      user: { uid: 'admin-1', email: 'admin@example.com' },
      loading: false,
      isAdmin: true,
      isAgent: false,
      allowedRegions: ['PRISHTINA'],
      mfaEnabled: true,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOutUser: vi.fn(),
    });
  });

  it('renders exports list with actions and disables start when running', async () => {
    renderWithProviders(<ExportsPanel />);
    const panel = await screen.findByTestId('exports-panel');
    expect(await within(panel).findByText('exp1')).toBeInTheDocument();
    const startBtn = await within(panel).findByRole('button', {
      name: /Start Members CSV Export/i,
    });
    await waitFor(() => {
      expect(startBtn).toBeDisabled();
    });
  });

  it('prevents starting exports when MFA is not enabled', async () => {
    useAuthMock.mockReturnValue({
      user: { uid: 'admin-1' },
      loading: false,
      isAdmin: true,
      isAgent: false,
      allowedRegions: ['PRISHTINA'],
      mfaEnabled: false,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOutUser: vi.fn(),
    });
    renderWithProviders(<ExportsPanel />);
    const panel = await screen.findByTestId('exports-panel');
    const startBtn = await within(panel).findByRole('button', {
      name: /Start Members CSV Export/i,
    });
    expect(startBtn).toBeDisabled();
    expect(
      within(panel).getByText((content) =>
        content
          .toLowerCase()
          .includes('multi-factor authentication is required')
      )
    ).toBeInTheDocument();
  });

  it('toggles Show more/Show less and resubscribes', async () => {
    renderWithProviders(<ExportsPanel />);
    const panel = await screen.findByTestId('exports-panel');
    const toggleBtn = await within(panel).findByRole('button', {
      name: /Show more/i,
    });
    fireEvent.click(toggleBtn);
    expect(
      within(panel).getByRole('button', { name: /Show less/i })
    ).toBeInTheDocument();
  });

  it('starts export and shows success toast', async () => {
    global.__fsSeed('exports', [
      { id: 'exp1', type: 'members', status: 'done' },
    ]);
    renderWithProviders(<ExportsPanel />);
    const panel = await screen.findByTestId('exports-panel');
    const startBtn = await within(panel).findByRole('button', {
      name: /Start Members CSV Export/i,
    });
    fireEvent.click(startBtn);

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith({
        type: 'success',
        message: 'Members CSV export started',
      });
    });
  });

  it('surfaces load failures once and resumes after refresh', async () => {
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    try {
      global.__fsThrow(new Error('firestore unavailable'));
      renderWithProviders(<ExportsPanel />);

      await waitFor(() => {
        expect(pushMock).toHaveBeenCalledWith({
          type: 'error',
          message: 'Failed to load exports',
        });
      });
      expect(pushMock).toHaveBeenCalledTimes(1);

      global.__fsReset();
      const restoredExports = [
        { id: 'exp1', type: 'members', status: 'done', createdAt: Date.now() },
      ];
      global.__fsSeed('exports', restoredExports);
      const refreshBtn = await screen.findByRole('button', {
        name: /Refresh/i,
      });
      fireEvent.click(refreshBtn);

      await screen.findByText('exp1');
      expect(pushMock).toHaveBeenCalledTimes(1);
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });

  it('shows a friendly message when the export callable rejects with permission denied', async () => {
    global.__fsSeed('exports', [
      { id: 'exp1', type: 'members', status: 'done' },
    ]);
    global.__setFunctionsResponse(() => {
      const error = new Error('nope') as Error & { code: string };
      error.code = 'functions/permission-denied';
      throw error;
    });

    renderWithProviders(<ExportsPanel />);
    const panel = await screen.findByTestId('exports-panel');
    const startBtn = await within(panel).findByRole('button', {
      name: /Start Members CSV Export/i,
    });
    fireEvent.click(startBtn);

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith({
        type: 'error',
        message: 'You need admin access to start exports.',
      });
    });
  });
});
