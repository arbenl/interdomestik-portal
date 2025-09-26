
import { describe, it, expect, vi, afterEach } from 'vitest';
import type { ReactNode } from 'react';
import { renderWithProviders, screen, waitFor, userEvent } from '@/test-utils';
import MemberPortal from './MemberPortal';
import { useAuth } from '@/hooks/useAuth';
import { makeUser } from '@/tests/factories/user';
import { getDefaultPortalLayout } from '@/services/portalDashboard';

declare const __setFunctionsResponse: (_impl: (_name: string, _payload: unknown) => unknown) => void;
declare const __resetFunctions: () => void;

vi.mock('@/hooks/useAuth');
vi.mock('@/hooks/useMfaPreference', () => ({
  __esModule: true,
  default: () => ({ mfaEnabled: true, setMfaPreference: vi.fn(), updating: false }),
  useMfaPreference: () => ({ mfaEnabled: true, setMfaPreference: vi.fn(), updating: false }),
}));
vi.mock('../components/ui/PanelBoundary', () => ({
  __esModule: true,
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock('../features/portal/ProfilePanel', () => ({
  ProfilePanel: () => <div data-testid="profile-panel">Profile Panel</div>,
}));
vi.mock('../features/portal/MembershipPanel', () => ({
  MembershipPanel: () => <div data-testid="membership-panel">Membership Panel</div>,
}));
vi.mock('../features/portal/BillingPanel', () => ({
  BillingPanel: () => <div data-testid="billing-panel">Billing Panel</div>,
}));

afterEach(() => {
  vi.unstubAllEnvs();
  __resetFunctions?.();
});

describe('MemberPortal', () => {
  it('asks unauthenticated users to sign in', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: false,
      isAdmin: false,
      isAgent: false,
      allowedRegions: [],
      mfaEnabled: false,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOutUser: vi.fn(),
    });
    renderWithProviders(<MemberPortal />);
    expect(screen.getByText(/Please sign in/i)).toBeInTheDocument();
  });

  it('renders main portal sections for signed-in user', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: makeUser({ displayName: 'Member One' }),
      loading: false,
      isAdmin: false,
      isAgent: false,
      allowedRegions: [],
      mfaEnabled: false,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOutUser: vi.fn(),
    });
    renderWithProviders(<MemberPortal />);
    await waitFor(() => expect(screen.getByTestId('profile-panel')).toBeInTheDocument());
    expect(screen.getByTestId('membership-panel')).toBeInTheDocument();
    expect(screen.getByTestId('billing-panel')).toBeInTheDocument();
    expect(screen.queryByTestId('assistant-launcher')).toBeNull();
    expect(screen.queryByTestId('dashboard-widget-grid')).toBeNull();
  });

  it('enables modernization features behind flags', async () => {
    vi.stubEnv('VITE_FLAG_ASSISTANT', 'true');
    vi.stubEnv('VITE_FLAG_WIDGETS', 'true');
    const layout = getDefaultPortalLayout();
    const assistantMock = vi.fn().mockResolvedValue({
      reply: 'Renewal guidance',
      followUps: ['Show renewal checklist'],
    });
    __setFunctionsResponse(async (name: string) => {
      if (name === 'getPortalDashboard') {
        return {
          generatedAt: new Date().toISOString(),
          widgets: [
            { id: 'renewalsDue', title: 'Renewals Due (30d)', value: '4', helper: 'Follow up soon', trend: 'up' },
            { id: 'paymentsCaptured', title: 'Payments Captured (7d)', value: '€250.00', helper: 'Up 10%', trend: 'up', delta: '+10%' },
          ],
        };
      }
      if (name === 'getPortalLayout') {
        return { widgets: layout };
      }
      if (name === 'upsertPortalLayout') {
        return { widgets: layout };
      }
      if (name === 'startAssistantSuggestion') {
        return assistantMock();
      }
      return {};
    });
    vi.mocked(useAuth).mockReturnValue({
      user: makeUser({ displayName: 'Admin User' }),
      loading: false,
      isAdmin: true,
      isAgent: false,
      allowedRegions: [],
      mfaEnabled: true,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOutUser: vi.fn(),
    });

    renderWithProviders(<MemberPortal />);

    await waitFor(() => expect(screen.getByTestId('dashboard-widget-grid')).toBeInTheDocument());
    expect(screen.getByTestId('assistant-launcher')).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByTestId('assistant-launcher'));
    const promptInput = await screen.findByPlaceholderText(/ask about renewals or billing/i);
    await user.type(promptInput, 'How do I renew my membership?');
    await user.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => expect(assistantMock).toHaveBeenCalled());
    expect(await screen.findByText(/Renewal guidance/i)).toBeInTheDocument();
  });
});
