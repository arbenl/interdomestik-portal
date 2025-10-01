import { useEffect, useMemo, useState } from 'react';
import type {
  PortalLayoutItem,
  PortalWidgetSummary,
} from '@/services/portalDashboard';

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
  const [managing, setManaging] = useState(false);
  const [draft, setDraft] = useState<PortalLayoutItem[]>(layout);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (managing) {
      setDraft(layout.map((item) => ({ ...item })));
    }
  }, [layout, managing]);

  const draftWithMetadata = useMemo(
    () =>
      draft.map((item) => {
        const meta = availableWidgets.find(
          (available) => available.id === item.id
        );
        return {
          ...item,
          title: meta?.title ?? item.id,
          description: meta?.description ?? '',
        };
      }),
    [draft, availableWidgets]
  );

  const moveDraftItem = (index: number, direction: -1 | 1) => {
    setDraft((prev) => {
      const next = [...prev];
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= next.length) return prev;
      const temp = next[index];
      next[index] = next[targetIndex];
      next[targetIndex] = temp;
      return next;
    });
  };

  const toggleHidden = (id: PortalLayoutItem['id']) => {
    setDraft((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, hidden: !item.hidden } : item
      )
    );
  };

  const resetDraft = () => {
    setDraft(layout.map((item) => ({ ...item, hidden: false })));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await onLayoutChange(draft);
      setManaging(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update layout');
    } finally {
      setSaving(false);
    }
  };

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
            className="rounded border border-indigo-200 px-3 py-1 text-sm font-medium text-indigo-600 hover:bg-indigo-50"
            onClick={() => setManaging(true)}
          >
            Manage Widgets
          </button>
        </div>
      </header>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {(isLoading ? layout : layout).map((item) => {
          const widget = widgets.find((w) => w.id === item.id);
          if (!widget || item.hidden) return null;
          return (
            <article
              key={item.id}
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
              <p className="mt-1 text-xs text-gray-500">{widget.helper}</p>
            </article>
          );
        })}
      </div>

      {managing ? (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/30"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-lg bg-white shadow-xl">
            <header className="border-b border-gray-200 px-4 py-3">
              <h3 className="text-base font-semibold text-gray-900">
                Customize dashboard
              </h3>
              <p className="text-xs text-gray-500">
                Drag-style controls coming soon — use checkboxes and arrows for
                now.
              </p>
            </header>
            <div className="max-h-[420px] overflow-y-auto px-4 py-3 space-y-3">
              {draftWithMetadata.map((widget, index) => (
                <div
                  key={widget.id}
                  className="rounded border border-gray-200 p-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">
                        {widget.title}
                      </p>
                      <p className="text-xs text-gray-500">
                        {widget.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        aria-label="Move widget up"
                        className="rounded border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-100"
                        onClick={() => moveDraftItem(index, -1)}
                        disabled={index === 0}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        aria-label="Move widget down"
                        className="rounded border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-100"
                        onClick={() => moveDraftItem(index, 1)}
                        disabled={index === draftWithMetadata.length - 1}
                      >
                        ↓
                      </button>
                      <label className="ml-2 flex items-center gap-1 text-xs text-gray-600">
                        <input
                          type="checkbox"
                          checked={Boolean(widget.hidden)}
                          onChange={() => toggleHidden(widget.id)}
                        />
                        Hide
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {error ? (
              <p className="px-4 text-sm text-red-600">{error}</p>
            ) : null}
            <footer className="flex justify-between border-t border-gray-200 px-4 py-3">
              <div className="flex gap-2">
                <button
                  type="button"
                  className="rounded border border-gray-200 px-3 py-1 text-sm text-gray-700 hover:bg-gray-100"
                  onClick={resetDraft}
                  disabled={saving}
                >
                  Reset
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="rounded border border-gray-200 px-3 py-1 text-sm text-gray-700 hover:bg-gray-100"
                  onClick={() => setManaging(false)}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="rounded bg-indigo-600 px-4 py-1 text-sm font-semibold text-white hover:bg-indigo-500 disabled:bg-indigo-300"
                  onClick={() => {
                    void handleSave();
                  }}
                  disabled={saving}
                  data-testid="save-widget-layout"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </footer>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default DashboardWidgetGrid;
