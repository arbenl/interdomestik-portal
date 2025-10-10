import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
} from 'vitest';
import {
  renderWithProviders,
  screen,
  userEvent,
  waitFor,
  mockUseAuth,
} from '@/test-utils';
import PortalEvents from '../PortalEvents';

vi.mock('@/hooks/useAuth');

declare const __fsSeed: (path: string, rows: any[]) => void;
declare const __fsReset: () => void;

describe('PortalEvents', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_FLAG_PORTAL_EVENTS', 'true');
    __fsReset();
    mockUseAuth({
      allowedRegions: ['IBERIA', 'REMOTE'],
    });
    vi.spyOn(Date, 'now').mockReturnValue(
      new Date('2025-10-01T00:00:00Z').getTime()
    );
  });

  afterEach(() => {
    __fsReset();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('renders Firestore-backed events and filters workshops', async () => {
    __fsSeed('events', [
      {
        id: 'summit-eu',
        title: 'Quarterly Member Summit',
        startAt: { toDate: () => new Date('2025-10-12T00:00:00Z') },
        location: 'Madrid, ES',
        focus: 'Regional policy updates • Partner showcase',
        tags: ['conference'],
        regions: ['IBERIA'],
      },
      {
        id: 'webinar-renewals',
        title: 'Retention Playbook Workshop',
        startAt: { toDate: () => new Date('2025-11-02T00:00:00Z') },
        location: 'Virtual',
        focus: 'Renewal automations • Outreach cadences',
        tags: ['workshop'],
        regions: ['REMOTE'],
      },
    ]);

    renderWithProviders(<PortalEvents />);

    expect(
      await screen.findByText('Quarterly Member Summit')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Retention Playbook Workshop')
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Workshops/i }));

    await waitFor(() => {
      expect(
        screen.getByText('Retention Playbook Workshop')
      ).toBeInTheDocument();
    });
    expect(
      screen.queryByText('Quarterly Member Summit')
    ).not.toBeInTheDocument();
  });

  it('filters by allowed regions when selecting My regions', async () => {
    __fsSeed('events', [
      {
        id: 'summit-eu',
        title: 'Quarterly Member Summit',
        startAt: { toDate: () => new Date('2025-10-12T00:00:00Z') },
        location: 'Madrid, ES',
        focus: 'Regional policy updates • Partner showcase',
        tags: ['conference'],
        regions: ['IBERIA'],
      },
      {
        id: 'meetup-nl',
        title: 'Benelux Member Meetup',
        startAt: { toDate: () => new Date('2025-11-18T00:00:00Z') },
        location: 'Amsterdam, NL',
        focus: 'Cross-border billing • Member spotlights',
        tags: ['meetup'],
        regions: ['BENELUX'],
      },
    ]);

    renderWithProviders(<PortalEvents />);

    await screen.findByText('Quarterly Member Summit');

    await userEvent.click(screen.getByRole('button', { name: /My regions/i }));

    await waitFor(() => {
      expect(
        screen.getByText('Quarterly Member Summit')
      ).toBeInTheDocument();
    });
    expect(
      screen.queryByText('Benelux Member Meetup')
    ).not.toBeInTheDocument();
  });

  it('falls back to placeholder events when the flag is disabled', async () => {
    vi.unstubAllEnvs();
    vi.stubEnv('VITE_FLAG_PORTAL_EVENTS', 'false');
    __fsReset();

    renderWithProviders(<PortalEvents />);

    await waitFor(() => {
      expect(
        screen.getByText('Quarterly Member Summit')
      ).toBeInTheDocument();
    });
    expect(
      screen.getByText('Retention Playbook Workshop')
    ).toBeInTheDocument();
  });
});
