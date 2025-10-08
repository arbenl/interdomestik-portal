import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import {
  fetchPortalLayout,
  savePortalLayout,
  getDefaultPortalLayout,
  type PortalLayoutItem,
} from '@/services/portalDashboard';

type UsePortalLayoutResult = {
  layout: PortalLayoutItem[];
  enabled: boolean;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  refresh: () => Promise<void>;
  updateLayout: (widgets: PortalLayoutItem[]) => Promise<void>;
  isUpdating: boolean;
};

export function usePortalLayout(): UsePortalLayoutResult {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const enabled = Boolean(user);
  const userKey = user?.uid ?? 'anonymous';
  const layoutQueryKey = useMemo(
    () => ['portalLayout', userKey] as const,
    [userKey]
  );

  const layoutQuery = useQuery({
    queryKey: layoutQueryKey,
    queryFn: fetchPortalLayout,
    enabled,
    select: (result) => result.widgets,
    staleTime: 60_000,
  });

  const mutation = useMutation({
    mutationFn: (widgets: PortalLayoutItem[]) => savePortalLayout(widgets),
    onSuccess: (result) => {
      queryClient.setQueryData(layoutQueryKey, result.widgets);
    },
  });

  const layout = useMemo(() => {
    const widgets = layoutQuery.data ?? getDefaultPortalLayout();
    if (!widgets.length) {
      return getDefaultPortalLayout();
    }
    return widgets;
  }, [layoutQuery.data]);

  const refresh = async (): Promise<void> => {
    if (!enabled) return;
    await queryClient.invalidateQueries({ queryKey: layoutQueryKey });
  };

  const updateLayout = async (widgets: PortalLayoutItem[]): Promise<void> => {
    if (!enabled) {
      throw new Error('Authentication required');
    }
    await mutation.mutateAsync(widgets);
  };

  return {
    layout,
    enabled,
    isLoading:
      enabled &&
      (layoutQuery.isLoading || layoutQuery.isFetching || mutation.isPending),
    isError: Boolean(layoutQuery.error),
    error: layoutQuery.error ?? null,
    refresh,
    updateLayout,
    isUpdating: mutation.isPending,
  };
}

export default usePortalLayout;
