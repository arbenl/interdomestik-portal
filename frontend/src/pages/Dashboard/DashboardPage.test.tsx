import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders, screen, mockUseAuth } from '@/test-utils';
import DashboardPage from './DashboardPage';
import usePortalLayout from '@/features/dashboard/hooks/usePortalLayout';

vi.mock('@/hooks/useAuth');
vi.mock('@/features/dashboard/hooks/usePortalLayout');

const mockUsePortalLayout = vi.mocked(usePortalLayout);

describe('DashboardPage', () => {
  beforeEach(() => {
    mockUseAuth();
    mockUsePortalLayout.mockReturnValue({
      layout: [
        { id: 'renewalsDue' },
        { id: 'paymentsCaptured', hidden: true },
        { id: 'eventRegistrations' },
      ],
      enabled: true,
      isLoading: false,
      isError: false,
      error: null,
      refresh: vi.fn(),
      updateLayout: vi.fn(),
      isUpdating: false,
    });
  });

  it('renders heading and welcome copy', () => {
    renderWithProviders(<DashboardPage />);

    expect(
      screen.getByRole('heading', { name: /Dashboard/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Welcome to your personalized workspace/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Manage Widgets/i })
    ).toBeInTheDocument();
  });
});
