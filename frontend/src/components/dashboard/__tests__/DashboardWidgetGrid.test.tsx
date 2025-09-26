import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DashboardWidgetGrid } from '../DashboardWidgetGrid';
import type { PortalLayoutItem, PortalWidgetSummary } from '@/services/portalDashboard';

const widgets: PortalWidgetSummary[] = [
  { id: 'renewalsDue', title: 'Renewals Due (30d)', value: '5', helper: 'Follow up with members', trend: 'up' },
  { id: 'paymentsCaptured', title: 'Payments Captured (7d)', value: '€200.00', helper: 'Up 20%', trend: 'up', delta: '+20%' },
];

const layout: PortalLayoutItem[] = [
  { id: 'renewalsDue' },
  { id: 'paymentsCaptured' },
];

const availableWidgets = [
  { id: 'renewalsDue', title: 'Renewals Due (30d)', description: 'Renewal queue', hidden: false },
  { id: 'paymentsCaptured', title: 'Payments Captured (7d)', description: 'Revenue health', hidden: false },
];

describe('DashboardWidgetGrid', () => {
  it('renders widgets in order with values', () => {
    render(
      <DashboardWidgetGrid
        widgets={widgets}
        layout={layout}
        availableWidgets={availableWidgets}
        isLoading={false}
        isUpdating={false}
        onRefresh={vi.fn()}
        onLayoutChange={async () => {}}
      />,
    );

    expect(screen.getByText('Renewals Due (30d)')).toBeInTheDocument();
    expect(screen.getByText('Payments Captured (7d)')).toBeInTheDocument();
    expect(screen.getByText('€200.00')).toBeInTheDocument();
  });

  it('allows hiding a widget through the manage dialog and persists via callback', async () => {
    const onLayoutChange = vi.fn().mockResolvedValue(undefined);

    render(
      <DashboardWidgetGrid
        widgets={widgets}
        layout={layout}
        availableWidgets={availableWidgets}
        isLoading={false}
        isUpdating={false}
        onRefresh={vi.fn()}
        onLayoutChange={onLayoutChange}
      />,
    );

    fireEvent.click(screen.getByTestId('manage-widgets-button'));
    const hideCheckbox = screen.getAllByRole('checkbox')[0];
    fireEvent.click(hideCheckbox);
    fireEvent.click(screen.getByTestId('save-widget-layout'));

    await waitFor(() => {
      expect(onLayoutChange).toHaveBeenCalled();
    });
    const payload = onLayoutChange.mock.calls[0][0] as PortalLayoutItem[];
    expect(payload[0]).toMatchObject({ id: 'renewalsDue', hidden: true });
  });
});
