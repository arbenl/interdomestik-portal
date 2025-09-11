import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Admin from '../Admin';

vi.mock('../../hooks/useAdmin', () => ({ default: () => ({ isAdmin: true, loading: false }) }));
vi.mock('../../hooks/useAgentOrAdmin', () => ({ default: () => ({ canRegister: false, allowedRegions: [], loading: false }) }));
vi.mock('../../hooks/useAuditLogs', () => ({ useAuditLogs: () => ({ items: [], loading: false, error: null }) }));
vi.mock('../../hooks/useMemberSearch', () => ({ useMemberSearch: () => ({ results: [], loading: false, error: null, search: vi.fn(), clear: vi.fn() }) }));
vi.mock('../../hooks/useUsers', () => ({ useUsers: () => ({ users: [], loading: false, error: null, refresh: vi.fn(), nextPage: vi.fn(), prevPage: vi.fn(), hasNext: false, hasPrev: false, page: 1 }) }));
vi.mock('../../hooks/useReports', () => ({ default: () => ({ items: [{ id: 'r1', type: 'monthly', month: '2025-09', total: 5, revenue: 125 }], loading: false, error: null }) }));
vi.mock('../../components/ui/useToast', () => ({ useToast: () => ({ push: vi.fn() }) }));

vi.mock('firebase/functions', async () => ({ getFunctions: () => ({} as any), connectFunctionsEmulator: () => {}, httpsCallable: () => vi.fn().mockResolvedValue({ data: { ok: true, month: '2025-09' } }) }));

describe('Admin Reports panel', () => {
  it('renders monthly report rows with CSV link', () => {
    render(<Admin />);
    expect(screen.getByText(/Monthly Reports/i)).toBeInTheDocument();
    expect(screen.getByText('2025-09')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Download CSV/i })).toBeInTheDocument();
  });
});

