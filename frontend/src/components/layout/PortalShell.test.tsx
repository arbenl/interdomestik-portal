import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test-utils';
import PortalShell from './PortalShell';
import { useAuth } from '@/hooks/useAuth';
import useMfaPreference from '@/hooks/useMfaPreference';

vi.mock('@/hooks/useAuth');
vi.mock('@/hooks/useMfaPreference', () => ({
  __esModule: true,
  default: vi.fn(),
}));

describe('PortalShell', () => {
  const mockedUseAuth = vi.mocked(useAuth);
  const mockedUseMfaPreference = vi.mocked(useMfaPreference);

  beforeEach(() => {
    mockedUseAuth.mockReturnValue({
      user: { uid: 'user-1' },
      isAdmin: false,
      isAgent: false,
      mfaEnabled: true,
      allowedRegions: [],
      loading: false,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOutUser: vi.fn(),
    } as any);

    mockedUseMfaPreference.mockReturnValue({
      setMfaPreference: vi.fn(),
      updating: false,
    });
  });

  it('renders header and children content', () => {
    renderWithProviders(
      <PortalShell header={<div>Header Content</div>}>
        <p>Child Area</p>
      </PortalShell>
    );

    expect(screen.getByText('Header Content')).toBeInTheDocument();
    expect(screen.getByText('Child Area')).toBeInTheDocument();
  });

  it('renders portal navigation with active state', () => {
    renderWithProviders(
      <PortalShell>
        <p>Child Area</p>
      </PortalShell>,
      { initialEntries: ['/portal'] }
    );

    const overviewLinks = screen.getAllByRole('link', { name: 'Overview' });
    expect(overviewLinks.length).toBeGreaterThan(0);
    expect(
      overviewLinks.some((link) => link.getAttribute('aria-current') === 'page')
    ).toBe(true);
    expect(screen.getAllByRole('link', { name: 'Support' }).length).toBe(2);
  });
});
