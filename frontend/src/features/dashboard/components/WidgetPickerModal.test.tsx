import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders, screen, userEvent } from '@/test-utils';
import WidgetPickerModal from './WidgetPickerModal';

describe('WidgetPickerModal', () => {
  const baseLayout = [
    { id: 'renewalsDue' as const },
    { id: 'paymentsCaptured' as const, hidden: true },
    { id: 'eventRegistrations' as const },
  ];
  const widgetOptions = [
    {
      id: 'renewalsDue' as const,
      title: 'Renewals Due (30d)',
      description: 'Members expiring soon',
      hidden: false,
    },
    {
      id: 'paymentsCaptured' as const,
      title: 'Payments Captured (7d)',
      description: 'Recent payments',
      hidden: true,
    },
    {
      id: 'eventRegistrations' as const,
      title: 'Upcoming Events',
      description: 'Next events on the calendar',
      hidden: false,
    },
  ];

  it('renders all widget options when open', () => {
    renderWithProviders(
      <WidgetPickerModal
        open
        onOpenChange={vi.fn()}
        layout={baseLayout}
        availableWidgets={widgetOptions}
        onSave={vi.fn()}
      />
    );

    expect(
      screen.getByRole('checkbox', { name: /Renewals Due/i })
    ).toBeChecked();
    expect(
      screen.getByRole('checkbox', { name: /Payments Captured/i })
    ).not.toBeChecked();
    expect(
      screen.getByRole('checkbox', { name: /Upcoming Events/i })
    ).toBeChecked();
  });

  it('toggles widget visibility and saves the new layout', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onOpenChange = vi.fn();

    renderWithProviders(
      <WidgetPickerModal
        open
        onOpenChange={onOpenChange}
        layout={baseLayout}
        availableWidgets={widgetOptions}
        onSave={onSave}
      />
    );

    const paymentsToggle = screen.getByRole('checkbox', {
      name: /Payments Captured/i,
    });
    expect(paymentsToggle).not.toBeChecked();

    await userEvent.click(paymentsToggle);
    expect(paymentsToggle).toBeChecked();

    const saveButton = screen.getByRole('button', { name: /Save/i });
    await userEvent.click(saveButton);

    expect(onSave).toHaveBeenCalledWith([
      { id: 'renewalsDue' },
      { id: 'paymentsCaptured' },
      { id: 'eventRegistrations' },
    ]);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
