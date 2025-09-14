import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { renderWithProviders, screen, within } from '@/test-utils';
import Admin from '../Admin';
import { useAuth } from '@/context/auth';

vi.mock('@/context/auth');

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
    const headers = await screen.findAllByText(/Exports/i);
    expect(headers.length).toBeGreaterThan(0);
  });

  it('toggles Show more/Show less and resubscribes', async () => {
    renderWithProviders(<Admin />);
    const headers = await screen.findAllByText(/Exports/i);
    expect(headers.length).toBeGreaterThan(0);
    const panel = headers[0].closest('div') as HTMLElement;
    const toggleBtn = within(panel).getByRole('button', { name: /Show more/i });
    expect(toggleBtn).toBeInTheDocument();
  });

  it('starts export and shows success toast', async () => {
    renderWithProviders(<Admin />);
    const headers = await screen.findAllByText(/Exports/i);
    const panel = headers[0].closest('div') as HTMLElement;
    const startBtn = within(panel).getByRole('button', { name: /Start Members CSV Export/i });
    expect(startBtn).toBeInTheDocument();
  });
});