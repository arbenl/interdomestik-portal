import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, userEvent, waitFor } from '@/test-utils';
import type { AutomationAlert } from '@/hooks/useAutomationAlerts';
import { AlertItem } from '../AlertItem';

const acknowledgeAlertMock = vi.hoisted(() => vi.fn());

vi.mock('@/services/alerts', () => ({
  acknowledgeAlert: acknowledgeAlertMock,
}));

describe('AlertItem', () => {
  beforeEach(() => {
    acknowledgeAlertMock.mockReset();
    acknowledgeAlertMock.mockResolvedValue({
      acknowledged: true,
      acknowledgedAt: new Date().toISOString(),
    });
  });

  it('sends acknowledgement when the button is clicked', async () => {
    const alert: AutomationAlert = {
      id: 'alert-1',
      url: 'https://example.com/hooks/renewals',
      windowDays: 7,
      count: 3,
      status: '503',
      severity: 'critical',
      message: 'Renewal webhook failed',
      actor: 'automation',
      createdAt: new Date('2025-09-25T11:00:00Z'),
      acknowledged: false,
      acknowledgedAt: null,
      acknowledgedBy: null,
    };

    renderWithProviders(<AlertItem alert={alert} />, {
      initialEntries: ['/admin'],
    });

    const button = screen.getByRole('button', { name: /acknowledge/i });
    await userEvent.click(button);

    expect(acknowledgeAlertMock).toHaveBeenCalledWith('alert-1');
    await waitFor(() => {
      expect(button).toBeDisabled();
      expect(button).toHaveTextContent(/acknowledged/i);
    });
  });
});
