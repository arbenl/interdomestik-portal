import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import Admin from '../Admin';

vi.mock('../../hooks/useAdmin', () => ({ default: () => ({ isAdmin: true, loading: false }) }));
vi.mock('../../hooks/useAgentOrAdmin', () => ({ default: () => ({ canRegister: false, allowedRegions: [], loading: false }) }));
vi.mock('../../hooks/useAuditLogs', () => ({ useAuditLogs: () => ({ items: [], loading: false, error: null }) }));
vi.mock('../../hooks/useMemberSearch', () => ({ useMemberSearch: () => ({ results: [], loading: false, error: null, search: vi.fn(), clear: vi.fn() }) }));
vi.mock('../../components/ui/useToast', () => ({ useToast: () => ({ push: vi.fn() }) }));

const users = [
  { id: 'u1', name: 'Alpha', email: 'a@example.com', memberNo: 'INT-2025-000001', region: 'PRISHTINA', status: 'none' },
  { id: 'u2', name: 'Beta', email: 'b@example.com', memberNo: 'INT-2025-000002', region: 'PRISHTINA', status: 'expired' }
];

vi.mock('../../hooks/useUsers', () => ({
  useUsers: () => ({ users, loading: false, error: null, refresh: vi.fn(), nextPage: vi.fn(), prevPage: vi.fn(), hasNext: false, hasPrev: false, page: 1 })
}));

vi.mock('firebase/functions', async (importOriginal) => {
  // Provide getFunctions used by src/firebase.ts and stub httpsCallable
  return {
    getFunctions: () => ({} as any),
    connectFunctionsEmulator: () => {},
    httpsCallable: () => vi.fn().mockResolvedValue({ data: { message: 'ok', refPath: 'x' } })
  };
});

describe('Admin page (smoke)', () => {
  beforeEach(() => {
    vi.resetModules();
  });
  it('renders users and bulk renew bar after selection', async () => {
    render(<Admin />);
    const table = await screen.findByTestId('users-table');
    const rows = within(table).getAllByRole('row');
    // skip header row, interact with first data row checkbox
    const firstRow = rows[1];
    const checkbox = within(firstRow).getByTestId('row-select') as HTMLInputElement;
    fireEvent.click(checkbox);
    // Bulk action bar visible
    expect(await screen.findByTestId('bulk-renew')).toBeInTheDocument();
  });
});
