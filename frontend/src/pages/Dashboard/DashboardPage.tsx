import React, { useMemo, useState } from 'react';
import WidgetGrid from '@/features/dashboard/components/WidgetGrid';
import WidgetPickerModal from '@/features/dashboard/components/WidgetPickerModal';
import usePortalLayout from '@/features/dashboard/hooks/usePortalLayout';
import {
  PORTAL_WIDGET_METADATA,
  type PortalWidgetId,
} from '@/services/portalDashboard';

const DashboardPage: React.FC = () => {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const { layout, updateLayout, isUpdating, isLoading, enabled } =
    usePortalLayout();

  const widgetOptions = useMemo(
    () =>
      (
        Object.entries(PORTAL_WIDGET_METADATA) as Array<
          [PortalWidgetId, { title: string; description: string }]
        >
      ).map(([id, meta]) => {
        const layoutItem = layout.find((item) => item.id === id);
        return {
          id,
          title: meta.title,
          description: meta.description,
          hidden: Boolean(layoutItem?.hidden),
        };
      }),
    [layout]
  );

  const canManageWidgets = enabled && widgetOptions.length > 0;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-slate-600">
            Welcome to your personalized workspace.
          </p>
        </div>
        {canManageWidgets ? (
          <button
            type="button"
            className="inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={() => setIsPickerOpen(true)}
            disabled={isLoading || isUpdating}
          >
            Manage Widgets
          </button>
        ) : null}
      </header>
      <WidgetGrid />
      <WidgetPickerModal
        open={isPickerOpen}
        onOpenChange={setIsPickerOpen}
        layout={layout}
        availableWidgets={widgetOptions}
        onSave={updateLayout}
        isSaving={isUpdating}
      />
    </div>
  );
};

export default DashboardPage;
