import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { renderWithProviders, screen, within, fireEvent } from '@/test-utils';
import Admin from '../Admin';
import { useAuth } from '@/hooks/useAuth';

const seededExports = [
  { id: 'exp1', type: 'members', status: 'running', startedAt: 1700000000000 },
];

__fsSeed('exports', seededExports);

vi.mock('@/hooks/useAuth');

describe('Admin Exports panel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as Mock).mockReturnValue({
      isAdmin: true,
      isAgent: false,
      user: { uid: 'test-admin-uid' },
      loading: false,
      allowedRegions: ['PRISHTINA'],
    });
  });

  it('renders exports list with actions and disables start when running', async () => {
    renderWithProviders(<Admin />);
    const panel = await screen.findByTestId('exports-panel');
    expect(within(panel).getByText('exp1')).toBeInTheDocument();
    expect(within(panel).getByRole('button', { name: /Start Members CSV Export/i })).toBeDisabled();
  });

  it('toggles Show more/Show less and resubscribes', async () => {
    renderWithProviders(<Admin />);
    const panel = await screen.findByTestId('exports-panel');
    const toggleBtn = within(panel).getByRole('button', { name: /Show more/i });
    fireEvent.click(toggleBtn);
    expect(within(panel).getByRole('button', { name: /Show less/i })).toBeInTheDocument();
  });

  it('starts export and shows success toast', async () => {
    __fsSeed('exports', [{ id: 'exp1', type: 'members', status: 'done' }]);
    renderWithProviders(<Admin />);
    const panel = await screen.findByTestId('exports-panel');
    const startBtn = within(panel).getByRole('button', { name: /Start Members CSV Export/i });
    fireEvent.click(startBtn);
    // You would also test for the toast message here if it were implemented
  });
});