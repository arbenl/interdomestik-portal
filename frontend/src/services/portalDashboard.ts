import callFn from '@/services/functionsClient';

export type PortalWidgetId =
  | 'renewalsDue'
  | 'paymentsCaptured'
  | 'eventRegistrations'
  | 'churnRisk';

export type PortalWidgetSummary = {
  id: PortalWidgetId;
  title: string;
  value: string;
  helper: string;
  trend?: 'up' | 'down' | 'flat';
  delta?: string;
};

export type PortalDashboardResponse = {
  generatedAt: string;
  widgets: PortalWidgetSummary[];
};

export type PortalLayoutItem = {
  id: PortalWidgetId;
  hidden?: boolean;
};

export const PORTAL_WIDGET_METADATA: Record<
  PortalWidgetId,
  { title: string; description: string }
> = {
  renewalsDue: {
    title: 'Renewals Due (30d)',
    description: 'Members whose memberships expire soon',
  },
  paymentsCaptured: {
    title: 'Payments Captured (7d)',
    description: 'Membership revenue booked in the last week',
  },
  eventRegistrations: {
    title: 'Upcoming Events',
    description: 'Live programs members can join next',
  },
  churnRisk: {
    title: 'Churn Risk Profiles',
    description: 'Expired memberships needing outreach',
  },
};

const defaultLayout: PortalLayoutItem[] = Object.keys(
  PORTAL_WIDGET_METADATA
).map((id) => ({ id: id as PortalWidgetId }));

export const SUPPORTED_WIDGET_IDS: PortalWidgetId[] = defaultLayout.map(
  (item) => item.id
);

export function getDefaultPortalLayout(): PortalLayoutItem[] {
  return defaultLayout.map((item) => ({ ...item }));
}

export async function fetchPortalDashboard(): Promise<PortalDashboardResponse> {
  const result = await callFn<Record<string, never>, PortalDashboardResponse>(
    'getPortalDashboard',
    {} as Record<string, never>
  );
  return normalizeDashboardResponse(result);
}

export async function fetchPortalLayout(): Promise<{
  widgets: PortalLayoutItem[];
}> {
  const result = await callFn<
    Record<string, never>,
    { widgets?: PortalLayoutItem[] }
  >('getPortalLayout', {} as Record<string, never>);
  return { widgets: normalizeLayout(result.widgets) };
}

export async function savePortalLayout(
  widgets: PortalLayoutItem[]
): Promise<{ widgets: PortalLayoutItem[] }> {
  const payload = { widgets: normalizeLayout(widgets) };
  const result = await callFn<
    { widgets: PortalLayoutItem[] },
    { widgets?: PortalLayoutItem[] }
  >('upsertPortalLayout', payload);
  return { widgets: normalizeLayout(result.widgets) };
}

function normalizeDashboardResponse(
  response: PortalDashboardResponse
): PortalDashboardResponse {
  if (!response || !Array.isArray(response.widgets)) {
    return { generatedAt: new Date(0).toISOString(), widgets: [] };
  }
  const widgets = response.widgets
    .filter((widget) => SUPPORTED_WIDGET_IDS.includes(widget.id))
    .map((widget) => ({
      ...widget,
      helper: widget.helper ?? '',
      value: widget.value ?? '',
    }));
  return {
    generatedAt: response.generatedAt || new Date().toISOString(),
    widgets,
  };
}

function normalizeLayout(input?: PortalLayoutItem[]): PortalLayoutItem[] {
  const seen = new Set<PortalWidgetId>();
  const output: PortalLayoutItem[] = [];
  if (Array.isArray(input)) {
    for (const item of input) {
      if (!item || !SUPPORTED_WIDGET_IDS.includes(item.id)) continue;
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      output.push({ id: item.id, hidden: Boolean(item.hidden) });
    }
  }
  for (const id of SUPPORTED_WIDGET_IDS) {
    if (!seen.has(id)) {
      output.push({ id });
    }
  }
  return output;
}
