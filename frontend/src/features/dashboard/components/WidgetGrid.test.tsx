import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders, screen } from '@/test-utils';
import WidgetGrid from './WidgetGrid';
import { usePortalLayout } from '../hooks/usePortalLayout';
import RenewalsWidget from './RenewalsWidget';
let latestDragEnd: ((_: any) => void) | undefined;

const mockArrayMove = vi.fn(<T,>(items: T[], from: number, to: number): T[] => {
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
});

vi.mock('../hooks/usePortalLayout');
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
vi.mock('./RenewalsWidget', () => {
  const MockComponent = vi.fn(() => (
    <div data-testid="renewals-widget">Renewals Widget</div>
  ));
  return {
    __esModule: true,
    default: MockComponent,
    RenewalsWidget: MockComponent,
  };
});
vi.mock('./SortableWidget', () => {
  const MockSortable = vi.fn(
    ({ children, id }: { children: any; id: string }) => (
      <div data-testid={`sortable-${id}`}>{children}</div>
    )
  );
  return {
    __esModule: true,
    default: MockSortable,
    SortableWidget: MockSortable,
  };
});

const mockUsePortalLayout = vi.mocked(usePortalLayout);
const mockRenewalsWidget = vi.mocked(RenewalsWidget);

describe('WidgetGrid', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    latestDragEnd = undefined;
  });

  it('renders visible widgets from the layout', () => {
    mockUsePortalLayout.mockReturnValue({
      layout: [
        { id: 'renewalsDue' },
        { id: 'paymentsCaptured', hidden: true },
        { id: 'eventRegistrations' },
      ],
      enabled: true,
      isLoading: false,
      isError: false,
      error: null,
      refresh: vi.fn(),
      updateLayout: vi.fn(),
      isUpdating: false,
    });

    renderWithProviders(<WidgetGrid />);

    expect(screen.getByTestId('renewals-widget')).toBeInTheDocument();
    expect(mockRenewalsWidget).toHaveBeenCalled();
    expect(
      screen.getByRole('heading', { name: /upcoming events/i })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: /payments captured/i })
    ).not.toBeInTheDocument();
  });

  it('persists a reordered layout when dragging finishes', () => {
    const updateLayout = vi.fn();
    const layout = [
      { id: 'renewalsDue' },
      { id: 'paymentsCaptured', hidden: true },
      { id: 'eventRegistrations' },
    ];
    mockUsePortalLayout.mockReturnValue({
      layout,
      enabled: true,
      isLoading: false,
      isError: false,
      error: null,
      refresh: vi.fn(),
      updateLayout,
      isUpdating: false,
    });

    renderWithProviders(<WidgetGrid />);

    expect(latestDragEnd).toBeDefined();
    latestDragEnd?.({
      active: { id: 'eventRegistrations' },
      over: { id: 'renewalsDue' },
    });

    expect(mockArrayMove).toHaveBeenCalledWith(layout, 2, 0);
    expect(updateLayout).toHaveBeenCalledWith([
      { id: 'eventRegistrations' },
      { id: 'renewalsDue' },
      { id: 'paymentsCaptured', hidden: true },
    ]);
  });

  it('shows a loading state', () => {
    mockUsePortalLayout.mockReturnValue({
      layout: [],
      enabled: true,
      isLoading: true,
      isError: false,
      error: null,
      refresh: vi.fn(),
      updateLayout: vi.fn(),
      isUpdating: false,
    });

    renderWithProviders(<WidgetGrid />);

    expect(screen.getByText(/loading widgets/i)).toBeInTheDocument();
  });

  it('renders an error message when the hook reports a failure', () => {
    mockUsePortalLayout.mockReturnValue({
      layout: [],
      enabled: true,
      isLoading: false,
      isError: true,
      error: new Error('boom'),
      refresh: vi.fn(),
      updateLayout: vi.fn(),
      isUpdating: false,
    });

    renderWithProviders(<WidgetGrid />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(
      screen.getByText(/Unable to load dashboard layout/i)
    ).toBeInTheDocument();
  });
});
