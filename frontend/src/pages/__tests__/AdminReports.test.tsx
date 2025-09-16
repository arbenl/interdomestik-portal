import { renderWithProviders, screen, waitFor } from '@/test-utils';
import { vi, type Mock, describe, it, expect } from 'vitest';
import Admin from '../Admin';
import useAgentOrAdmin from '@/hooks/useAgentOrAdmin';
import { useReports } from '@/hooks/useReports';

vi.mock('@/hooks/useAgentOrAdmin');
vi.mock('@/hooks/useReports');

describe('Admin Reports panel', () => {
  it('renders monthly report rows with CSV link', async () => {
    (useAgentOrAdmin as Mock).mockReturnValue({ isAdmin: true, canRegister: true, allowedRegions: ['PRISHTINA'], loading: false });
    (useReports as Mock).mockReturnValue({ data: [{ id: '2025-09', rowCount: 5 }], isLoading: false, error: null });

    renderWithProviders(<Admin />);

    await waitFor(() => {
      expect(screen.getByText('Monthly Reports')).toBeInTheDocument();
    });
    expect(screen.getByText('2025-09')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });
});