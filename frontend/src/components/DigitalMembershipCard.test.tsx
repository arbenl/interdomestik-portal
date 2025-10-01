import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '@/test-utils';
import DigitalMembershipCard from './DigitalMembershipCard';

describe('DigitalMembershipCard', () => {
  it('renders member info and status', () => {
    renderWithProviders(
      <DigitalMembershipCard
        name="Member One"
        memberNo="INT-2025-000001"
        region="PRISHTINA"
        validUntil="2025-12-31"
        status="active"
        verifyUrl="https://example.com/verify?memberNo=INT-2025-000001"
      />
    );
    expect(screen.getByText(/Member No\./i)).toBeInTheDocument();
    expect(screen.getByText('INT-2025-000001')).toBeInTheDocument();
    expect(screen.getByText('Member One')).toBeInTheDocument();
    expect(screen.getByText('PRISHTINA')).toBeInTheDocument();
    expect(screen.getByText('2025-12-31')).toBeInTheDocument();
    expect(screen.getAllByText(/ACTIVE/i).length).toBeGreaterThan(0);
  });
});
