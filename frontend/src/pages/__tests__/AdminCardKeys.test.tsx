import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';

vi.mock('../../hooks/useAdmin', () => ({ default: () => ({ isAdmin: true, loading: false }) }));
vi.mock('../../hooks/useAgentOrAdmin', () => ({ default: () => ({ canRegister: false, allowedRegions: [], loading: false }) }));
vi.mock('../../hooks/useAuditLogs', () => ({ useAuditLogs: () => ({ items: [], loading: false, error: null }) }));
vi.mock('../../hooks/useMemberSearch', () => ({ useMemberSearch: () => ({ results: [], loading: false, error: null, search: vi.fn(), clear: vi.fn() }) }));
vi.mock('../../hooks/useUsers', () => ({ useUsers: () => ({ users: [], loading: false, error: null, refresh: vi.fn(), nextPage: vi.fn(), prevPage: vi.fn(), hasNext: false, hasPrev: false, page: 1 }) }));
vi.mock('../../hooks/useReports', () => ({ default: () => ({ items: [], loading: false, error: null }) }));

const pushMock = vi.fn();
vi.mock('../../components/ui/useToast', () => ({ useToast: () => ({ push: pushMock }) }));

const { httpsCallableMock } = vi.hoisted(() => ({ httpsCallableMock: vi.fn() }));
vi.mock('firebase/functions', () => ({
  getFunctions: () => ({} as any),
  connectFunctionsEmulator: () => {},
  httpsCallable: () => httpsCallableMock,
}));

// Import Admin after mocks are set up
import Admin from '../Admin';

describe('Admin Card Keys panel', () => {
  beforeEach(() => {
    vi.resetModules();
    pushMock.mockReset();
    httpsCallableMock.mockReset();
  });

  it('shows active kid and allows revoke by jti', async () => {
    // First call: getCardKeyStatusCallable
    httpsCallableMock.mockResolvedValueOnce({ data: { activeKid: 'v2', kids: ['v1', 'v2'] } });
    // Second call: revokeCardToken
    httpsCallableMock.mockResolvedValueOnce({ data: { ok: true } });

    render(<Admin />);
    const headers = await screen.findAllByText(/Card Keys & Tokens/i);
    expect(headers.length).toBeGreaterThan(0);
    const panel = headers[0].closest('div') as HTMLElement;
    expect(within(panel).getByText(/Active key id:/i)).toBeInTheDocument();
    expect(await within(panel).findByText('v2')).toBeInTheDocument();

    const jtiInput = within(panel).getByLabelText(/jti/i) as HTMLInputElement;
    jtiInput.value = 'abc123';
    jtiInput.dispatchEvent(new Event('input', { bubbles: true }));
    const reasonInput = within(panel).getByLabelText(/reason/i) as HTMLInputElement;
    reasonInput.value = 'lost';
    reasonInput.dispatchEvent(new Event('input', { bubbles: true }));
    const revokeBtn = within(panel).getByRole('button', { name: /Revoke/i });
    revokeBtn.click();
    await new Promise((r) => setTimeout(r, 0));
    expect(pushMock).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
  });
});
