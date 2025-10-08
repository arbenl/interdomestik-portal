import type { CSSProperties, ReactNode } from 'react';
import { useSortable } from '@dnd-kit/sortable';

type SortableWidgetProps = {
  id: string;
  children: ReactNode;
};

export const SortableWidget = ({ id, children }: SortableWidgetProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: CSSProperties = {
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    transition,
    cursor: isDragging ? 'grabbing' : 'grab',
    zIndex: isDragging ? 50 : 'auto',
    opacity: isDragging ? 0.9 : 1,
    touchAction: 'manipulation',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      data-testid={`sortable-${id}`}
    >
      {children}
    </div>
  );
};

export default SortableWidget;
