import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import Billing from '../Billing';

vi.mock('../../hooks/useAuth', () => ({ useAuth: () => ({ user: { uid: 'u1', displayName: 'Test User' } }) }));
vi.mock('../../hooks/useMemberProfile', () => ({ useMemberProfile: () => ({ profile: { name: 'Test User', expiresAt: { seconds: Math.floor(Date.now()/1000) + 86400 } } }) }));
vi.mock('../../hooks/useInvoices', () => ({ useInvoices: () => ({ invoices: [], loading: false, error: null, refresh: vi.fn() }) }));
vi.mock('../../components/ui/useToast', () => ({ default: () => ({ push: vi.fn() }) }));

describe('Billing page', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });
  it('renders headings and actions', () => {
    render(<Billing />);
    expect(screen.getByText(/Billing & Subscription/i)).toBeInTheDocument();
    expect(screen.getByText(/Resend card email/i)).toBeInTheDocument();
  });
});

