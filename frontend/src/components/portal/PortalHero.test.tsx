import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '@/test-utils';
import PortalHero from './PortalHero';

describe('PortalHero', () => {
  it('renders name, status chip, memberNo and expiry', () => {
    renderWithProviders(
      <PortalHero
        name="Member One"
        status="active"
        memberNo="INT-2025-000001"
        expiresOn="2025-12-31"
        verifyUrl="https://example.com/verify?memberNo=INT-2025-000001"
      />
    );
    expect(screen.getByText(/Welcome, Member One/)).toBeInTheDocument();
    expect(screen.getByText(/ACTIVE/)).toBeInTheDocument();
    expect(screen.getByText(/Member No: INT-2025-000001/)).toBeInTheDocument();
    expect(screen.getByText(/Valid until: 2025-12-31/)).toBeInTheDocument();
    // action buttons
    expect(
      screen.getByRole('button', { name: /Update profile/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /View history/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Verify membership/i })
    ).toBeInTheDocument();
  });
});
