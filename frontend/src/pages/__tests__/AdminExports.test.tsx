import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, within, fireEvent, waitFor } from '@/test-utils';
import { ExportsPanel } from '@/features/admin/exports/ExportsPanel';

const pushMock = vi.fn();
vi.mock('@/components/ui/useToast', () => ({ useToast: () => ({ push: pushMock }) }));

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
  });

  it('renders exports list with actions and disables start when running', async () => {
    renderWithProviders(<ExportsPanel />);
    const panel = await screen.findByTestId('exports-panel');
    expect(await within(panel).findByText('exp1')).toBeInTheDocument();
    const startBtn = await within(panel).findByRole('button', { name: /Start Members CSV Export/i });
    await waitFor(() => {
      expect(startBtn).toBeDisabled();
    });
  });

  it('toggles Show more/Show less and resubscribes', async () => {
    renderWithProviders(<ExportsPanel />);
    const panel = await screen.findByTestId('exports-panel');
    const toggleBtn = await within(panel).findByRole('button', { name: /Show more/i });
    fireEvent.click(toggleBtn);
    expect(within(panel).getByRole('button', { name: /Show less/i })).toBeInTheDocument();
  });

  it('starts export and shows success toast', async () => {
    global.__fsSeed('exports', [{ id: 'exp1', type: 'members', status: 'done' }]);
    renderWithProviders(<ExportsPanel />);
    const panel = await screen.findByTestId('exports-panel');
    const startBtn = await within(panel).findByRole('button', { name: /Start Members CSV Export/i });
    fireEvent.click(startBtn);

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith({ type: 'success', message: 'Members CSV export started' });
    });
  });
});
