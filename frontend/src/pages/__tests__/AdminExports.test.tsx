import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import Admin from '../Admin';

vi.mock('../../hooks/useAdmin', () => ({ default: () => ({ isAdmin: true, loading: false }) }));
vi.mock('../../hooks/useAgentOrAdmin', () => ({ default: () => ({ canRegister: false, allowedRegions: [], loading: false }) }));
vi.mock('../../hooks/useAuditLogs', () => ({ useAuditLogs: () => ({ items: [], loading: false, error: null }) }));
vi.mock('../../hooks/useMemberSearch', () => ({ useMemberSearch: () => ({ results: [], loading: false, error: null, search: vi.fn(), clear: vi.fn() }) }));
vi.mock('../../hooks/useUsers', () => ({ useUsers: () => ({ users: [], loading: false, error: null, refresh: vi.fn(), nextPage: vi.fn(), prevPage: vi.fn(), hasNext: false, hasPrev: false, page: 1 }) }));
vi.mock('../../hooks/useReports', () => ({ default: () => ({ items: [], loading: false, error: null }) }));
const pushMock = vi.fn();
vi.mock('../../components/ui/useToast', () => ({ useToast: () => ({ push: pushMock }) }));

vi.mock('firebase/functions', async () => ({ getFunctions: () => ({} as any), connectFunctionsEmulator: () => {}, httpsCallable: () => vi.fn().mockResolvedValue({ data: { ok: true } }) }));

describe('Admin Exports panel', () => {
  beforeEach(() => {
    vi.resetModules();
    pushMock.mockReset();
  });

  it('renders exports list with actions and disables start when running', async () => {
    const docs = [
      { id: 'exp1', data: () => ({ status: 'done', url: 'https://example.com/members.csv', path: 'exports/members/members_2025-09-01_0000.csv', size: 1024, count: 10, createdAt: { seconds: 1693526400 } }) },
      { id: 'exp2', data: () => ({ status: 'running', path: 'exports/members/members_2025-09-01_0100.csv', createdAt: { seconds: 1693530000 } }) },
    ];

    const onSnapshot = (await import('firebase/firestore')).onSnapshot as unknown as vi.Mock;
    onSnapshot.mockImplementation((_q: any, next: (snap: any) => void) => { next({ docs }); return () => {}; });

    render(<Admin />);

    // Heading
    const headers = await screen.findAllByText(/Exports/i);
    expect(headers.length).toBeGreaterThan(0);
    // Download link for done export
    expect(screen.getByRole('link', { name: /Download/i })).toBeInTheDocument();
    // Start button disabled due to running export
    const startBtn = screen.getByRole('button', { name: /Start Members CSV Export/i }) as HTMLButtonElement;
    expect(startBtn.disabled).toBe(true);
    // Copy helpers present
    expect(screen.getByRole('button', { name: /Copy link/i })).toBeInTheDocument();
    const gsButtons = screen.getAllByRole('button', { name: /Copy gs:\/\//i });
    expect(gsButtons.length).toBeGreaterThan(0);
  });

  it('toggles Show more/Show less and resubscribes', async () => {
    const docs = [
      { id: 'exp1', data: () => ({ status: 'done', url: 'https://example.com/members.csv', path: 'exports/members/members_2025-09-01_0000.csv', size: 2048, count: 20, createdAt: { seconds: 1693526400 } }) },
    ];
    const onSnapshot = (await import('firebase/firestore')).onSnapshot as unknown as vi.Mock;
    onSnapshot.mockReset();
    onSnapshot.mockImplementation((_q: any, next: (snap: any) => void) => { next({ docs }); return () => {}; });

    render(<Admin />);
    const headers = await screen.findAllByText(/Exports/i);
    expect(headers.length).toBeGreaterThan(0);
    const panel = headers[0].closest('div') as HTMLElement;
    const toggleBtn = within(panel).getByRole('button', { name: /Show more/i });
    expect(toggleBtn).toBeInTheDocument();
    // First subscription
    expect(onSnapshot).toHaveBeenCalledTimes(1);
    // Toggle to show more
    toggleBtn.click();
    // Label changes
    expect(await screen.findByRole('button', { name: /Show less/i })).toBeInTheDocument();
    // Resubscription should occur
    expect(onSnapshot).toHaveBeenCalledTimes(2);
  });

  it('starts export and shows success toast', async () => {
    const docs: any[] = [];
    const onSnapshot = (await import('firebase/firestore')).onSnapshot as unknown as vi.Mock;
    onSnapshot.mockReset();
    onSnapshot.mockImplementation((_q: any, next: (snap: any) => void) => { next({ docs }); return () => {}; });

    render(<Admin />);
    const headers = await screen.findAllByText(/Exports/i);
    const panel = headers[0].closest('div') as HTMLElement;
    const startBtn = within(panel).getByRole('button', { name: /Start Members CSV Export/i });
    expect(startBtn).toBeInTheDocument();
    expect((startBtn as HTMLButtonElement).disabled).toBe(false);
    startBtn.click();
    // Allow promises to resolve
    await new Promise((r) => setTimeout(r, 0));
    expect(pushMock).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
  });
});
