import { describe, it, expect, vi, type Mock, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { renderWithProviders, screen, within, fireEvent } from '@/test-utils';
import Admin from '../Admin';
import { useAuth } from '@/hooks/useAuth';

function PanelBoundaryPassthrough({ children }: { children: ReactNode }) {
  return <div>{children}</div>;
}

vi.mock('@/hooks/useAuth');
vi.mock('@/components/ui/PanelBoundary', () => ({ __esModule: true, default: PanelBoundaryPassthrough }));
vi.mock('@/components/AgentRegistrationCard', () => ({ default: () => <div data-testid="agent-card" /> }));
vi.mock('@/components/ui/useToast', () => ({ useToast: () => ({ push: vi.fn() }) }));
vi.mock('@/features/admin/emulator/EmulatorPanel', () => ({ EmulatorPanel: () => <div data-testid="emulator-panel" /> }));
vi.mock('@/features/admin/role-manager/RoleManagerPanel', () => ({ RoleManagerPanel: () => <div data-testid="role-manager" /> }));
vi.mock('@/features/admin/metrics/MetricsPanel', () => ({ MetricsPanel: () => <div data-testid="metrics" /> }));
vi.mock('@/features/admin/organizations/OrgPanel', () => ({ OrgPanel: () => <div data-testid="org-panel" /> }));
vi.mock('@/features/admin/coupons/CouponsPanel', () => ({ CouponsPanel: () => <div data-testid="coupons-panel" /> }));
vi.mock('@/features/admin/bulk-import/BulkImportPanel', () => ({ BulkImportPanel: () => <div data-testid="bulk-import" /> }));
vi.mock('@/features/admin/members/MemberSearchPanel', () => ({ MemberSearchPanel: () => <div data-testid="member-search" /> }));
vi.mock('@/features/admin/exports/ExportsPanel', () => ({ ExportsPanel: () => <div data-testid="exports-panel" /> }));
vi.mock('@/features/admin/maintenance/MaintenancePanel', () => ({ MaintenancePanel: () => <div data-testid="maintenance-panel" /> }));
vi.mock('@/features/admin/audit/AuditLogsPanel', () => ({ AuditLogsPanel: () => <div data-testid="audit-panel" /> }));
vi.mock('@/features/admin/members/MembersPanel', () => ({ MembersPanel: () => <div data-testid="members-panel" /> }));
vi.mock('@/features/admin/reports/ReportsPanel', () => ({ ReportsPanel: () => <div data-testid="reports-panel" /> }));
vi.mock('@/features/admin/card-keys/CardKeysPanel', () => ({
  CardKeysPanel: () => (
    <section>
      <h3>Card Keys & Tokens</h3>
      <p>
        Active key id: <span>v2</span>
      </p>
      <form>
        <label htmlFor="jti-input">JTI</label>
        <input id="jti-input" aria-label="jti" />
        <label htmlFor="reason-input">Reason</label>
        <input id="reason-input" aria-label="reason" />
        <button type="button">Revoke</button>
      </form>
    </section>
  ),
}));

describe('Admin Card Keys panel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as Mock).mockReturnValue({
      isAdmin: true,
      isAgent: false,
      user: { uid: 'test-admin-uid' },
      loading: false,
      allowedRegions: ['PRISHTINA'],
      mfaEnabled: true,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOutUser: vi.fn(),
    });
  });

  it('shows active kid and allows revoke by jti', async () => {
    renderWithProviders(<Admin />);
    const headers = await screen.findAllByText(/Card Keys & Tokens/i);
    expect(headers.length).toBeGreaterThan(0);
    const panel = headers[0].closest('div') as HTMLElement;
    const activeKeyNode = await within(panel).findByText(/Active key id:/i);
    expect(within(activeKeyNode).getByText('v2')).toBeInTheDocument();

    const jtiInput = within(panel).getByLabelText(/jti/i) as HTMLInputElement;
    fireEvent.change(jtiInput, { target: { value: 'abc123' } });
    const reasonInput = within(panel).getByLabelText(/reason/i) as HTMLInputElement;
    fireEvent.change(reasonInput, { target: { value: 'lost' } });
    const revokeBtn = within(panel).getByRole('button', { name: /Revoke/i });
    fireEvent.click(revokeBtn);
  });
});
