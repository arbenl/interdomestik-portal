import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import {
  fetchPortalDashboard,
  fetchPortalLayout,
  savePortalLayout,
  getDefaultPortalLayout,
  PORTAL_WIDGET_METADATA,
  SUPPORTED_WIDGET_IDS,
  type PortalLayoutItem,
  type PortalWidgetSummary,
} from '@/services/portalDashboard';

interface UsePortalDashboardOptions {
  enabled: boolean;
}

interface UsePortalDashboardResult {
  enabled: boolean;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  widgets: PortalWidgetSummary[];
  layout: PortalLayoutItem[];
  availableWidgets: Array<{ id: PortalLayoutItem['id']; title: string; description: string; hidden: boolean }>;
  refresh: () => Promise<void>;
  updateLayout: (widgets: PortalLayoutItem[]) => Promise<void>;
  updating: boolean;
}

const FALLBACK_WIDGETS = getDefaultPortalLayout().map(item => ({
  id: item.id,
  title: PORTAL_WIDGET_METADATA[item.id].title,
  value: '—',
  helper: PORTAL_WIDGET_METADATA[item.id].description,
  trend: 'flat' as const,
}));

export function usePortalDashboard({ enabled }: UsePortalDashboardOptions): UsePortalDashboardResult {
  const { user, isAdmin, isAgent, allowedRegions } = useAuth();
  const queryClient = useQueryClient();
  const canAccess = Boolean(user) && enabled && (isAdmin || isAgent);
  const userCacheKey = user?.uid ?? 'anonymous';
  const allowedRegionsKey = allowedRegions.length > 0 ? [...allowedRegions].sort().join(',') : 'none';
  const dashboardQueryKey = ['portalDashboard', userCacheKey, allowedRegionsKey] as const;

  const dashboardQuery = useQuery({
    queryKey: dashboardQueryKey,
    queryFn: fetchPortalDashboard,
    enabled: canAccess,
    staleTime: 60_000,
  });

  const layoutQuery = useQuery({
    queryKey: ['portalLayout', userCacheKey],
    queryFn: fetchPortalLayout,
    enabled: canAccess,
    staleTime: Infinity,
    select: data => data.widgets,
  });

  const mutation = useMutation({
    mutationFn: savePortalLayout,
    onSuccess: result => {
      queryClient.setQueryData(['portalLayout', userCacheKey], result.widgets);
    },
  });

  const layout = canAccess
    ? layoutQuery.data ?? getDefaultPortalLayout()
    : getDefaultPortalLayout();

  const dataMap = useMemo(() => {
    const map = new Map<PortalWidgetSummary['id'], PortalWidgetSummary>();
    dashboardQuery.data?.widgets.forEach(widget => {
      map.set(widget.id, widget);
    });
    return map;
  }, [dashboardQuery.data]);

  const widgets = useMemo(() => {
    if (!canAccess) return FALLBACK_WIDGETS;
    return layout
      .filter(item => !item.hidden && SUPPORTED_WIDGET_IDS.includes(item.id))
      .map(item => dataMap.get(item.id) ?? {
        id: item.id,
        title: PORTAL_WIDGET_METADATA[item.id].title,
        value: '—',
        helper: PORTAL_WIDGET_METADATA[item.id].description,
        trend: 'flat' as const,
      });
  }, [layout, dataMap, canAccess]);

  const availableWidgets = useMemo(() => layout.map(item => ({
    id: item.id,
    title: PORTAL_WIDGET_METADATA[item.id].title,
    description: PORTAL_WIDGET_METADATA[item.id].description,
    hidden: Boolean(item.hidden),
  })), [layout]);

  const refresh = async (): Promise<void> => {
    const dash = queryClient.invalidateQueries({ queryKey: dashboardQueryKey });
    const lay = queryClient.invalidateQueries({ queryKey: ['portalLayout', userCacheKey] });
    await Promise.all([dash, lay]);
  };

  const updateLayout = async (widgetsInput: PortalLayoutItem[]) => {
    if (!canAccess) return;
    await mutation.mutateAsync(widgetsInput);
  };

  return {
    enabled: canAccess,
    isLoading: canAccess && (dashboardQuery.isFetching || layoutQuery.isFetching || dashboardQuery.isLoading || layoutQuery.isLoading),
    isError: Boolean(dashboardQuery.error || layoutQuery.error),
    error: dashboardQuery.error || layoutQuery.error,
    widgets,
    layout,
    availableWidgets,
    refresh,
    updateLayout,
    updating: mutation.isPending,
  };
}

export default usePortalDashboard;
