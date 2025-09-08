import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MemberPortal from './MemberPortal';
import type { Profile, Membership, EventItem } from '../types';

// Shared stubs to let tests tweak returns
type Stubs = {
  auth: { user: { uid: string; displayName?: string } | null; loading: boolean };
  profile: { profile: Profile | null; activeMembership: Membership | null; loading: boolean; error: Error | null };
  history: { history: Membership[]; loading: boolean; error: Error | null };
  events: { events: EventItem[]; loading: boolean; error: Error | null };
  directory: { members: { id: string; name?: string; region?: string }[]; loading: boolean; error: Error | null };
};
const stubs: Stubs = {
  auth: { user: { uid: 'u1', displayName: 'Member One' }, loading: false },
  profile: { profile: { name: 'Member One', memberNo: 'INT-2025-000001', region: 'PRISHTINA' }, activeMembership: null, loading: false, error: null },
  history: { history: [{ id: '2025', year: 2025, status: 'active' }], loading: false, error: null },
  events: { events: [{ id: 'e1', title: 'Welcome meetup', startAt: { seconds: 200000 }, location: 'PRISHTINA' }], loading: false, error: null },
  directory: { members: [{ id: 'm1', name: 'Member Two', region: 'PEJA' }], loading: false, error: null },
};

vi.mock('../hooks/useAuth', () => ({ useAuth: () => stubs.auth }));
vi.mock('../hooks/useMemberProfile', () => ({ useMemberProfile: () => stubs.profile }));
vi.mock('../hooks/useMembershipHistory', () => ({ useMembershipHistory: () => stubs.history }));
vi.mock('../hooks/useEvents', () => ({ useEvents: () => stubs.events }));
vi.mock('../hooks/useDirectory', () => ({ useDirectory: () => stubs.directory }));

describe('MemberPortal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // reset default stubs
    stubs.auth = { user: { uid: 'u1', displayName: 'Member One' }, loading: false };
    stubs.profile = { profile: { name: 'Member One', memberNo: 'INT-2025-000001', region: 'PRISHTINA' }, activeMembership: null, loading: false, error: null };
    stubs.history = { history: [{ id: '2025', year: 2025 }], loading: false, error: null };
    stubs.events = { events: [{ id: 'e1', title: 'Welcome meetup', startAt: { seconds: 200000 }, location: 'PRISHTINA' }], loading: false, error: null };
    stubs.directory = { members: [{ id: 'm1', name: 'Member Two', region: 'PEJA' }], loading: false, error: null };
  });

  it('renders main portal sections for signed-in user', () => {
    render(
      <MemoryRouter>
        <MemberPortal />
      </MemoryRouter>
    );

    expect(screen.getByText(/Welcome, Member One/i)).toBeInTheDocument();
    expect(screen.getByText(/Your digital card/i)).toBeInTheDocument();
    expect(screen.getByText(/Recent activity/i)).toBeInTheDocument();
    expect(screen.getByText(/Upcoming events/i)).toBeInTheDocument();
    expect(screen.getByText(/Community/i)).toBeInTheDocument();
    expect(screen.getByText(/Billing & Subscription/i)).toBeInTheDocument();

    // key links
    expect(screen.getByRole('link', { name: /Open billing/i })).toHaveAttribute('href', '/billing');
  });

  it('asks unauthenticated users to sign in', () => {
    stubs.auth = { user: null, loading: false };
    render(
      <MemoryRouter>
        <MemberPortal />
      </MemoryRouter>
    );
    expect(screen.getByText(/Please sign in/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Go to Sign In/i })).toBeInTheDocument();
  });
});
