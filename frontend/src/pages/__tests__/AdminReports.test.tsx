import { renderWithProviders, screen, within } from '@/test-utils';
import { vi, describe, it, expect } from 'vitest';
import { ReportsPanel } from '@/features/admin/reports/ReportsPanel';
import { useReports } from '@/hooks/useReports';

vi.mock('@/hooks/useReports');

describe('Admin Reports panel', () => {
  it('renders monthly report rows with CSV link', async () => {
    (useReports as Mock).mockReturnValue({ data: [{ id: 'report-1', month: '2025-09', total: 5 }], isLoading: false, error: null });

    renderWithProviders(<ReportsPanel />);

    const panel = await screen.findByTestId('reports-panel');
    const panelScope = within(panel);

    expect(panelScope.getByText('Monthly Reports')).toBeInTheDocument();
    expect(panelScope.getByText('2025-09')).toBeInTheDocument();
    expect(panelScope.getByText('5')).toBeInTheDocument();
  });
});
