import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen } from '@/test-utils';
import { useQuery } from '@tanstack/react-query';
import { RenewalsWidget } from './RenewalsWidget';

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>();
  return {
    ...actual,
    useQuery: vi.fn(),
  };
});

const mockUseQuery = vi.mocked(useQuery);

describe('RenewalsWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders a loading skeleton while fetching', () => {
    mockUseQuery.mockReturnValue({
      isLoading: true,
      isError: false,
      error: null,
      data: undefined,
    } as any);

    renderWithProviders(<RenewalsWidget />);

    expect(screen.getByTestId('renewals-widget-skeleton')).toBeInTheDocument();
  });

  it('shows an error message when the query fails', () => {
    mockUseQuery.mockReturnValue({
      isLoading: false,
      isError: true,
      error: new Error('Boom'),
      data: undefined,
    } as any);

    renderWithProviders(<RenewalsWidget />);

    expect(screen.getByRole('alert')).toHaveTextContent('Boom');
  });

  it('displays the renewals count when data loads', () => {
    mockUseQuery.mockReturnValue({
      isLoading: false,
      isError: false,
      error: null,
      data: {
        generatedAt: new Date().toISOString(),
        widgets: [
          {
            id: 'renewalsDue',
            title: 'Renewals Due (30d)',
            value: '12',
            helper: 'Members expiring soon',
          },
        ],
      },
    } as any);

    renderWithProviders(<RenewalsWidget />);

    expect(screen.getByTestId('renewals-count')).toHaveTextContent('12');
    expect(screen.getByText(/Members expiring soon/i)).toBeInTheDocument();
  });
});
