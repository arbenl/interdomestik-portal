import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DndContext,
  closestCorners,
  type DragEndEvent,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  rectSortingStrategy,
  arrayMove,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import {
  getDefaultPortalLayout,
  PORTAL_WIDGET_METADATA,
  type PortalWidgetId,
} from '@/services/portalDashboard';
import { usePortalLayout } from '../hooks/usePortalLayout';
import SortableWidget from './SortableWidget';
import RenewalsWidget from './RenewalsWidget';

const FALLBACK_LAYOUT = getDefaultPortalLayout();
const WIDGET_COMPONENTS: Partial<Record<PortalWidgetId, React.FC>> = {
  renewalsDue: RenewalsWidget,
};

export const WidgetGrid: React.FC = () => {
  const { layout, isLoading, isError, error, updateLayout } = usePortalLayout();

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
        : FALLBACK_LAYOUT;

  const sortableIds = useMemo(
    () => widgetsToRender.map((widget) => widget.id),
    [widgetsToRender]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) {
        return;
      }

      setOrderedLayout((currentOrder) => {
        const fromIndex = currentOrder.findIndex(
          (item) => item.id === active.id
        );
        const toIndex = currentOrder.findIndex((item) => item.id === over.id);
        if (fromIndex === -1 || toIndex === -1) {
          return currentOrder;
        }

        const updated = arrayMove(currentOrder, fromIndex, toIndex);
        void updateLayout(updated);
        return updated;
      });
    },
    [updateLayout]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  if (isLoading) {
    return (
      <div className="rounded border border-slate-200 bg-white p-4 shadow-sm">
        Loading widgets…
      </div>
    );
  }

  if (isError) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : typeof error === 'string'
          ? error
          : '';
    return (
      <div
        className="rounded border border-red-200 bg-red-50 p-4 text-red-700"
        role="alert"
      >
        Unable to load dashboard layout.
        {errorMessage ? ` ${errorMessage}` : ''}
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={sortableIds} strategy={rectSortingStrategy}>
        <div className="grid gap-4 md:grid-cols-2">
          {widgetsToRender.map((widget) => {
            const WidgetComponent = WIDGET_COMPONENTS[widget.id];
            return (
              <SortableWidget key={widget.id} id={widget.id}>
                {WidgetComponent ? (
                  <WidgetComponent />
                ) : (
                  <div className="rounded border border-slate-200 bg-white p-4 shadow-sm">
                    <h2 className="text-lg font-semibold">
                      {PORTAL_WIDGET_METADATA[widget.id]?.title ?? widget.id}
                    </h2>
                    <p className="text-sm text-slate-600">
                      {PORTAL_WIDGET_METADATA[widget.id]?.description ??
                        'Widget content coming soon.'}
                    </p>
                  </div>
                )}
              </SortableWidget>
            );
          })}
        </div>
      </SortableContext>
    </DndContext>
  );
};

export default WidgetGrid;
