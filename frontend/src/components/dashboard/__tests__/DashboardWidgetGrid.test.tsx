import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DashboardWidgetGrid } from '../DashboardWidgetGrid';
import type {
  PortalLayoutItem,
  PortalWidgetSummary,
} from '@/services/portalDashboard';

const widgets: PortalWidgetSummary[] = [
  {
    id: 'renewalsDue',
    title: 'Renewals Due (30d)',
    value: '5',
    helper: 'Follow up with members',
  },
  {
    id: 'paymentsCaptured',
    title: 'Payments Captured (7d)',
    value: '€200.00',
    helper: 'Up 20%',
  },
];

const layout: PortalLayoutItem[] = [
  { id: 'renewalsDue' },
  { id: 'paymentsCaptured', hidden: true },
  { id: 'eventRegistrations' },
];

const availableWidgets = [
  {
    id: 'renewalsDue',
    title: 'Renewals Due (30d)',
    description: 'Renewal queue',
    hidden: false,
  },
  {
    id: 'paymentsCaptured',
    title: 'Payments Captured (7d)',
    description: 'Revenue health',
    hidden: true,
  },
  {
    id: 'eventRegistrations',
    title: 'Upcoming Events',
    description: 'Events pipeline',
    hidden: false,
  },
];

let latestDragEnd: ((_: any) => void) | undefined;
const mockArrayMove = vi.fn(<T,>(items: T[], from: number, to: number): T[] => {
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
});

let mockWidgetPicker: ReturnType<typeof vi.fn>;

vi.mock('@radix-ui/react-dialog', () => ({
  Root: ({ children }: any) => children,
  Trigger: ({ children }: any) => children,
  Portal: ({ children }: any) => children,
  Overlay: ({ children }: any) => children,
  Content: ({ children }: any) => <div>{children}</div>,
  Title: ({ children }: any) => <div>{children}</div>,
  Description: ({ children }: any) => <div>{children}</div>,
  Close: ({ children }: any) => children,
}));

vi.mock('@dnd-kit/core', () => {
  const mockUseSensor = vi.fn((sensor: unknown, options: unknown) => ({
    sensor,
    options,
  }));
  const mockUseSensors = vi.fn((...sensors: unknown[]) => sensors);

  return {
    DndContext: ({ children, onDragEnd }: any) => {
      latestDragEnd = onDragEnd;
      return <div data-testid="dnd-context">{children}</div>;
    },
    closestCorners: vi.fn(),
    PointerSensor: vi.fn(),
    KeyboardSensor: vi.fn(),
    useSensor: mockUseSensor,
    useSensors: mockUseSensors,
  };
});

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: any) => (
    <div data-testid="sortable-context">{children}</div>
  ),
  rectSortingStrategy: vi.fn(),
  arrayMove: (...args: any[]) =>
    mockArrayMove(...(args as [any, number, number])),
  sortableKeyboardCoordinates: vi.fn(),
  useSortable: vi.fn().mockImplementation(({ id }: { id: string }) => ({
    setNodeRef: vi.fn(),
    attributes: { id },
    listeners: {},
    transform: null,
    transition: 'transform 150ms ease',
    isDragging: false,
  })),
}));

vi.mock('@/features/dashboard/components/SortableWidget', () => ({
  __esModule: true,
  default: ({ children, id }: { children: React.ReactNode; id: string }) => (
    <div data-testid={`sortable-${id}`}>{children}</div>
  ),
}));

vi.mock('@/features/dashboard/components/WidgetPickerModal', () => ({
  __esModule: true,
  default: (props: any) => mockWidgetPicker(props),
}));

describe('DashboardWidgetGrid', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    latestDragEnd = undefined;
    mockWidgetPicker = vi.fn((props: any) => {
      const isOpen = Boolean(props?.open);
      const onOpenChange = props?.onOpenChange as (_value: boolean) => void;
      const onSave = props?.onSave as (
        _value: PortalLayoutItem[]
      ) => Promise<void> | void;
      const pickerLayout = props?.layout as PortalLayoutItem[];
      return (
        <div data-testid="widget-picker" data-open={isOpen ? 'true' : 'false'}>
          <button type="button" onClick={() => onOpenChange(false)}>
            Close
          </button>
          <button
            type="button"
            onClick={() => {
              void onSave(pickerLayout);
            }}
          >
            Save Picker
          </button>
        </div>
      );
    });
  });

  it('renders visible widgets and manages modal open state', async () => {
    render(
      <DashboardWidgetGrid
        widgets={widgets}
        layout={layout}
        availableWidgets={availableWidgets}
        isLoading={false}
        isUpdating={false}
        onRefresh={vi.fn()}
        onLayoutChange={vi.fn()}
      />
    );

    expect(screen.getByText('Renewals Due (30d)')).toBeInTheDocument();
    expect(
      screen.queryByText('Payments Captured (7d)')
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('widget-picker')).toHaveAttribute(
      'data-open',
      'false'
    );

    await userEvent.click(screen.getByTestId('manage-widgets-button'));
    const lastCall = mockWidgetPicker.mock.calls.at(-1)?.[0] as
      | { open: boolean }
      | undefined;
    expect(lastCall?.open).toBe(true);
  });

  it('persists order changes via drag and drop', async () => {
    const onLayoutChange = vi.fn();
    render(
      <DashboardWidgetGrid
        widgets={widgets}
        layout={layout}
        availableWidgets={availableWidgets}
        isLoading={false}
        isUpdating={false}
        onRefresh={vi.fn()}
        onLayoutChange={onLayoutChange}
      />
    );

    expect(latestDragEnd).toBeDefined();
    await act(async () => {
      latestDragEnd?.({
        active: { id: 'eventRegistrations' },
        over: { id: 'renewalsDue' },
      });
    });

    expect(onLayoutChange).toHaveBeenCalledWith([
      { id: 'eventRegistrations' },
      { id: 'renewalsDue' },
      { id: 'paymentsCaptured', hidden: true },
    ]);
  });
});
