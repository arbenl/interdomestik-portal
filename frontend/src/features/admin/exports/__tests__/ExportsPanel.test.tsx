import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
} from 'vitest';
import {
  renderWithProviders,
  screen,
  waitFor,
  within,
  fireEvent,
} from '@/test-utils';
import { ExportsPanel } from '../ExportsPanel';

const pushMock = vi.fn();
const useAuthMock = vi.fn();

vi.mock('@/components/ui/useToast', () => ({
  useToast: () => ({ push: pushMock }),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => useAuthMock(),
}));

declare const __setFunctionsResponse: (
  impl: (name: string, payload: any) => any
) => void;
declare const __resetFunctions: () => void;

describe('ExportsPanel', () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    pushMock.mockReset();
    __resetFunctions();
    useAuthMock.mockReturnValue({
      user: { uid: 'admin-1', email: 'admin@example.com' },
      loading: false,
      isAdmin: true,
      isAgent: false,
      allowedRegions: [],
      mfaEnabled: true,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOutUser: vi.fn(),
    });
  });

  afterEach(() => {
    __resetFunctions();
  });

  it('renders export jobs with progress and disables start when one is running', async () => {
    __setFunctionsResponse((name: string) => {
      if (name === 'getMyExports') {
        return {
          jobs: [
            {
              id: 'exp-running',
              type: 'members_csv',
              status: 'running',
              startedAt: '2025-01-01T10:00:00.000Z',
              progress: { rows: 5, bytes: 4096 },
            },
            {
              id: 'exp-complete',
              type: 'members_csv',
              status: 'success',
              finishedAt: '2025-01-01T09:45:00.000Z',
              rows: 12,
              size: 12_288,
              url: 'https://storage.example.com/exp-complete.csv',
            },
          ],
        };
      }
      if (name === 'getExportStatus') {
        return {
          id: 'exp-running',
          type: 'members_csv',
          status: 'running',
          startedAt: '2025-01-01T10:00:00.000Z',
          progress: { rows: 5, bytes: 4096 },
        };
      }
      return {};
    });

    renderWithProviders(<ExportsPanel />);

    const panel = await screen.findByTestId('exports-panel');
    await waitFor(() => {
      expect(
        within(panel).getByRole('cell', { name: /exp-running/i })
      ).toBeInTheDocument();
    });
    expect(
      within(panel).getByRole('cell', { name: /^running$/i })
    ).toBeInTheDocument();
    expect(within(panel).getByText(/12 rows/i)).toBeInTheDocument();
    expect(
      within(panel).getByRole('link', { name: /Download/i })
    ).toBeInTheDocument();

    const startBtn = within(panel).getByRole('button', {
      name: /Start Members CSV Export/i,
    });
    expect(startBtn).toBeDisabled();
  });

  it('shows MFA warning and disables start when the user has not enabled MFA', async () => {
    useAuthMock.mockReturnValue({
      user: { uid: 'admin-1', email: 'admin@example.com' },
      loading: false,
      isAdmin: true,
      isAgent: false,
      allowedRegions: [],
      mfaEnabled: false,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOutUser: vi.fn(),
    });
    __setFunctionsResponse((name: string) => {
      if (name === 'getMyExports') {
        return { jobs: [] };
      }
      return {};
    });

    renderWithProviders(<ExportsPanel />);

    const panel = await screen.findByTestId('exports-panel');
    expect(
      within(panel).getByText(/Multi-factor authentication is required/i)
    ).toBeInTheDocument();
    expect(
      within(panel).getByRole('button', {
        name: /Start Members CSV Export/i,
      })
    ).toBeDisabled();
  });

  it('starts an export, shows success toast, and refreshes job status', async () => {
    let exportStatus = {
      id: 'exp-new',
      type: 'members_csv',
      status: 'running',
      startedAt: '2025-01-01T12:00:00.000Z',
      progress: { rows: 1, bytes: 200 },
    };
    let jobsResponse = { jobs: [] as Array<Record<string, unknown>> };

    __setFunctionsResponse((name: string) => {
      if (name === 'getMyExports') {
        return jobsResponse;
      }
      if (name === 'startMembersExport') {
        return { ok: true, id: 'exp-new' };
      }
      if (name === 'getExportStatus') {
        return exportStatus;
      }
      return {};
    });

    renderWithProviders(<ExportsPanel />);

    const panel = await screen.findByTestId('exports-panel');
    const startBtn = within(panel).getByRole('button', {
      name: /Start Members CSV Export/i,
    });
    fireEvent.click(startBtn);

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith({
        type: 'success',
        message: 'Members CSV export started',
      });
    });

    exportStatus = {
      id: 'exp-new',
      type: 'members_csv',
      status: 'success',
      finishedAt: '2025-01-01T12:05:00.000Z',
      rows: 20,
      size: 15_360,
      url: 'https://storage.example.com/exp-new.csv',
    };
    jobsResponse = {
      jobs: [
        {
          id: 'exp-new',
          type: 'members_csv',
          status: 'success',
          finishedAt: '2025-01-01T12:05:00.000Z',
          rows: 20,
          size: 15_360,
          url: 'https://storage.example.com/exp-new.csv',
        },
      ],
    };

    fireEvent.click(
      within(panel).getByRole('button', { name: /Refresh/i })
    );

    await waitFor(() => {
      expect(
        within(panel).getByRole('cell', { name: /exp-new/i })
      ).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(
        within(panel).getByRole('cell', { name: /^success$/i })
      ).toBeInTheDocument();
    });
  });

  it('surfaces MFA error from the callable when the backend rejects the request', async () => {
    __setFunctionsResponse((name: string) => {
      if (name === 'getMyExports') {
        return { jobs: [] };
      }
      if (name === 'startMembersExport') {
        const error = new Error('MFA required') as Error & { code: string };
        error.code = 'functions/failed-precondition';
        throw error;
      }
      return {};
    });

    renderWithProviders(<ExportsPanel />);

    const panel = await screen.findByTestId('exports-panel');
    const startBtn = within(panel).getByRole('button', {
      name: /Start Members CSV Export/i,
    });
    fireEvent.click(startBtn);

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith({
        type: 'error',
        message: 'Enable MFA before starting exports.',
      });
    });
  });

  it('shows inline error when exports cannot be loaded', async () => {
    __setFunctionsResponse((name: string) => {
      if (name === 'getMyExports') {
        const error = new Error('permission denied') as Error & { code: string };
        error.code = 'permission-denied';
        throw error;
      }
      return {};
    });

    renderWithProviders(<ExportsPanel />);

    const panel = await screen.findByTestId('exports-panel');
    await waitFor(() => {
      expect(
        within(panel).getByText(/Unable to load export history/i)
      ).toBeInTheDocument();
    });
  });
});
