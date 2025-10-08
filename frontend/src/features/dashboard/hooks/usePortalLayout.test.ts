import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHookWithProviders, waitFor, mockUseAuth } from '@/test-utils';
import {
  fetchPortalLayout,
  savePortalLayout,
  getDefaultPortalLayout,
  type PortalLayoutItem,
} from '@/services/portalDashboard';
import { usePortalLayout } from './usePortalLayout';

vi.mock('@/hooks/useAuth');
vi.mock('@/services/portalDashboard', () => ({
  fetchPortalLayout: vi.fn(),
  savePortalLayout: vi.fn(),
  getDefaultPortalLayout: vi.fn(),
  PORTAL_WIDGET_METADATA: {
    renewalsDue: { title: 'Renewals', description: 'Renewal widget' },
    paymentsCaptured: { title: 'Payments', description: 'Payments widget' },
    eventRegistrations: {
      title: 'Events',
      description: 'Upcoming events widget',
    },
    churnRisk: { title: 'Churn', description: 'Churn widget' },
  },
}));

const mockFetch = vi.mocked(fetchPortalLayout);
const mockSave = vi.mocked(savePortalLayout);
const mockGetDefault = vi.mocked(getDefaultPortalLayout);

describe('usePortalLayout', () => {
  const defaultLayout: PortalLayoutItem[] = [
    { id: 'renewalsDue' },
    { id: 'paymentsCaptured' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth();
    mockGetDefault.mockReturnValue(defaultLayout);
    mockFetch.mockResolvedValue({ widgets: defaultLayout });
    mockSave.mockResolvedValue({ widgets: defaultLayout });
  });

  it('returns layout data once loaded', async () => {
    const customLayout: PortalLayoutItem[] = [{ id: 'eventRegistrations' }];
    mockFetch.mockResolvedValueOnce({ widgets: customLayout });

    const { result } = renderHookWithProviders(() => usePortalLayout());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.enabled).toBe(true);
    expect(result.current.layout).toEqual(customLayout);
  });

  it('falls back to the default layout when query is empty', async () => {
    mockFetch.mockResolvedValueOnce({ widgets: [] });

    const { result } = renderHookWithProviders(() => usePortalLayout());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.layout).toEqual(defaultLayout);
  });

  it('calls the save mutation when updating the layout', async () => {
    const { result } = renderHookWithProviders(() => usePortalLayout());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const nextLayout: PortalLayoutItem[] = [
      { id: 'renewalsDue' },
      { id: 'churnRisk', hidden: true },
    ];
    mockSave.mockResolvedValueOnce({ widgets: nextLayout });

    await result.current.updateLayout(nextLayout);

    expect(mockSave).toHaveBeenCalledWith(nextLayout);
  });

  it('throws when updating while unauthenticated', async () => {
    mockUseAuth({ user: null });

    const { result } = renderHookWithProviders(() => usePortalLayout());

    expect(result.current.enabled).toBe(false);
    expect(result.current.layout).toEqual(defaultLayout);

    await expect(
      result.current.updateLayout([{ id: 'renewalsDue' }])
    ).rejects.toThrow('Authentication required');
  });
});
