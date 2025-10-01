import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen } from '@/test-utils';
import { MetricsPanel } from '../MetricsPanel';
const { automationMock, alertsMock, assistantMock, telemetryMock } = vi.hoisted(() => ({
  automationMock: vi.fn(),
  alertsMock: vi.fn(),
  assistantMock: vi.fn(),
  telemetryMock: vi.fn(),
}));

vi.mock('@/hooks/useAutomationLogs', () => ({ default: automationMock }));
vi.mock('@/hooks/useAutomationAlerts', () => ({ default: alertsMock }));
vi.mock('@/hooks/useAssistantSessions', () => ({ default: assistantMock }));
vi.mock('@/hooks/useAssistantTelemetry', () => ({ default: telemetryMock }));

describe('MetricsPanel', () => {
  beforeEach(() => {
    automationMock.mockReset();
    alertsMock.mockReset();
    assistantMock.mockReset();
    telemetryMock.mockReset();
  });

  it('renders automation logs and assistant telemetry', () => {
    automationMock.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        logs: [
          {
            id: 'log-1',
            url: 'https://example.com/hooks/renewals',
            windowDays: 10,
            count: 5,
            status: '200',
            actor: 'automation',
            dispatchedAt: new Date('2025-09-25T10:00:00Z'),
          },
        ],
      },
    });
    alertsMock.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        alerts: [
          {
            id: 'alert-1',
            url: 'https://example.com/hooks/renewals',
            windowDays: 10,
            count: 5,
            status: '503',
            severity: 'critical',
            message: 'Renewal webhook dispatch responded with status 503',
            actor: 'automation',
            createdAt: new Date('2025-09-25T11:00:00Z'),
            acknowledged: false,
          },
        ],
      },
    });
    assistantMock.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        sessions: [
          {
            uid: 'user-1',
            role: 'admin',
            lastPrompt: 'How do I renew members?',
            updatedAt: new Date(),
          },
          {
            uid: 'user-2',
            role: 'member',
            lastPrompt: 'Show billing info',
            updatedAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
          },
        ],
      },
    });
    telemetryMock.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        entries: [
          {
            id: 'telemetry-1',
            uid: 'assistant-admin',
            role: 'admin',
            latencyMs: 180,
            fallback: false,
            promptLength: 30,
            createdAt: new Date('2025-09-25T11:00:00Z'),
          },
          {
            id: 'telemetry-2',
            uid: 'assistant-admin',
            role: 'admin',
            latencyMs: 320,
            fallback: true,
            promptLength: 15,
            createdAt: new Date('2025-09-25T10:55:00Z'),
          },
        ],
      },
    });

    renderWithProviders(<MetricsPanel />);

    expect(screen.getByText(/Automation hooks/i)).toBeInTheDocument();
    expect(screen.getAllByText('https://example.com/hooks/renewals')).toHaveLength(2);
    expect(screen.getByText('5')).toBeInTheDocument();

    expect(screen.getByText(/Assistant telemetry/i)).toBeInTheDocument();
    expect(screen.getByText(/Total sessions/i).nextSibling?.textContent).toContain('2');
    expect(screen.getAllByText(/admin/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/How do I renew members/i)).toBeInTheDocument();
    expect(screen.getByText(/Active alerts/i)).toBeInTheDocument();
    expect(screen.getByText(/Renewal webhook dispatch responded with status 503/i)).toBeInTheDocument();
    expect(screen.getByText(/Avg/i).parentElement?.textContent).toContain('250');
    expect(screen.getByText(/P95/i).parentElement?.textContent).toContain('320');
    expect(screen.getByText(/Fallback/i).parentElement?.textContent).toContain('50.0%');
  });

  it('shows empty states when data is missing', () => {
    automationMock.mockReturnValue({ isLoading: false, isError: false, data: { logs: [] } });
    alertsMock.mockReturnValue({ isLoading: false, isError: false, data: { alerts: [] } });
    assistantMock.mockReturnValue({ isLoading: false, isError: false, data: { sessions: [] } });
    telemetryMock.mockReturnValue({ isLoading: false, isError: false, data: { entries: [] } });

    renderWithProviders(<MetricsPanel />);

    expect(screen.getByText(/No automation runs recorded yet/i)).toBeInTheDocument();
    expect(screen.getByText(/No assistant sessions recorded yet/i)).toBeInTheDocument();
    expect(screen.getByText(/No active alerts/i)).toBeInTheDocument();
  });
});
