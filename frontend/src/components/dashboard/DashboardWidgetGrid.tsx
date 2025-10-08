import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DndContext,
  closestCorners,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  rectSortingStrategy,
  arrayMove,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import type {
  PortalLayoutItem,
  PortalWidgetSummary,
} from '@/services/portalDashboard';
import WidgetPickerModal from '@/features/dashboard/components/WidgetPickerModal';
import SortableWidget from '@/features/dashboard/components/SortableWidget';

interface DashboardWidgetGridProps {
  widgets: PortalWidgetSummary[];
  layout: PortalLayoutItem[];
  availableWidgets: Array<{
    id: PortalLayoutItem['id'];
    title: string;
    description: string;
    hidden: boolean;
  }>;
  isLoading: boolean;
  isUpdating: boolean;
  onRefresh: () => Promise<unknown>;
  onLayoutChange: (widgets: PortalLayoutItem[]) => Promise<void>;
}

export function DashboardWidgetGrid({
  widgets,
  layout,
  availableWidgets,
  isLoading,
  isUpdating,
  onRefresh,
  onLayoutChange,
}: DashboardWidgetGridProps) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [orderedLayout, setOrderedLayout] = useState(layout);

  useEffect(() => {
    setOrderedLayout(layout);
  }, [layout]);

  const visibleWidgets = useMemo(
    () => orderedLayout.filter((item) => !item.hidden),
    [orderedLayout]
  );

  const widgetsToRender =
    visibleWidgets.length > 0
      ? visibleWidgets
      : orderedLayout.length > 0
        ? orderedLayout
        : layout;

  const sortableIds = useMemo(
    () => widgetsToRender.map((item) => item.id),
    [widgetsToRender]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      setOrderedLayout((currentOrder) => {
        const fromIndex = currentOrder.findIndex(
          (item) => item.id === active.id
        );
        const toIndex = currentOrder.findIndex((item) => item.id === over.id);
        if (fromIndex === -1 || toIndex === -1) return currentOrder;

        const updated = arrayMove(currentOrder, fromIndex, toIndex);
        void onLayoutChange(updated);
        return updated;
      });
    },
    [onLayoutChange]
  );

  return (
    <section
      data-testid="dashboard-widget-grid"
      aria-label="Portal analytics overview"
      className="mb-6"
    >
      <header className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Dashboard Overview
          </h2>
          <p className="text-sm text-gray-500">
            Reorder and toggle widgets without leaving the portal.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded border border-gray-200 px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-100"
            onClick={() => {
              void onRefresh();
            }}
            disabled={isLoading || isUpdating}
          >
            Refresh
          </button>
          <button
            type="button"
            data-testid="manage-widgets-button"
            className="rounded border border-indigo-200 px-3 py-1 text-sm font-medium text-indigo-600 hover:bg-indigo-50 disabled:opacity-60"
            onClick={() => setIsPickerOpen(true)}
            disabled={isLoading || isUpdating}
          >
            Manage Widgets
          </button>
        </div>
      </header>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={sortableIds} strategy={rectSortingStrategy}>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {widgetsToRender.map((item) => {
              if (item.hidden) return null;
              const widget = widgets.find((w) => w.id === item.id);
              if (!widget) return null;
              return (
                <SortableWidget key={item.id} id={item.id}>
                  <article
                    className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
                    data-widget-id={item.id}
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-gray-700">
                        {widget.title}
                      </h3>
                      {widget.delta ? (
                        <span className="text-xs font-medium text-indigo-600">
                          {widget.delta}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-2xl font-bold text-gray-900">
                      {widget.value}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {widget.helper}
                    </p>
                  </article>
                </SortableWidget>
              );
            })}
          </div>
        </SortableContext>
      </DndContext>

      <WidgetPickerModal
        open={isPickerOpen}
        onOpenChange={setIsPickerOpen}
        layout={layout}
        availableWidgets={availableWidgets}
        onSave={onLayoutChange}
        isSaving={isUpdating}
      />
    </section>
  );
}

export default DashboardWidgetGrid;
