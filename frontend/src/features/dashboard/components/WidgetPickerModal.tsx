import { useEffect, useMemo, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import type { PortalLayoutItem } from '@/services/portalDashboard';

type WidgetPickerModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  layout: PortalLayoutItem[];
  availableWidgets: Array<{
    id: PortalLayoutItem['id'];
    title: string;
    description: string;
    hidden: boolean;
  }>;
  onSave: (widgets: PortalLayoutItem[]) => Promise<void> | void;
  isSaving?: boolean;
};

export const WidgetPickerModal = ({
  open,
  onOpenChange,
  layout,
  availableWidgets,
  onSave,
  isSaving = false,
}: WidgetPickerModalProps) => {
  const [selected, setSelected] = useState<Set<PortalLayoutItem['id']>>(
    () => new Set()
  );

  useEffect(() => {
    if (!open) return;
    const visibleIds = layout
      .filter((item) => !item.hidden)
      .map((item) => item.id);
    setSelected(new Set(visibleIds));
  }, [layout, open]);

  const allWidgets = useMemo(
    () =>
      availableWidgets.map((widget) => ({
        id: widget.id,
        title: widget.title,
        description: widget.description,
      })),
    [availableWidgets]
  );

  const toggleWidget = (id: PortalLayoutItem['id']) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSave = async () => {
    const selection = new Set(selected);
    const existingIds = new Set(layout.map((item) => item.id));
    const updatedLayout: PortalLayoutItem[] = layout.map((item) => {
      const visible = selection.has(item.id);
      const next: PortalLayoutItem = { ...item };
      if (visible) {
        delete next.hidden;
      } else {
        next.hidden = true;
      }
      return next;
    });

    for (const widget of allWidgets) {
      if (!existingIds.has(widget.id) && selection.has(widget.id)) {
        updatedLayout.push({ id: widget.id });
      } else if (!existingIds.has(widget.id) && !selection.has(widget.id)) {
        updatedLayout.push({ id: widget.id, hidden: true });
      }
    }

    try {
      await onSave(updatedLayout);
      onOpenChange(false);
    } catch (error) {
      // Surface the error in the console for debugging but keep the modal open.
      console.error('Failed to persist widget layout', error);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" />
        <Dialog.Content className="relative mx-auto w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
          <Dialog.Title className="text-xl font-semibold">
            Manage Widgets
          </Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-slate-600">
            Choose which widgets should appear on your dashboard.
          </Dialog.Description>

          <div className="mt-4 space-y-3">
            {allWidgets.map((widget) => {
              const checked = selected.has(widget.id);
              return (
                <label
                  key={widget.id}
                  className="flex items-start gap-3 rounded border border-slate-200 p-3 hover:border-slate-300"
                >
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    checked={checked}
                    onChange={() => toggleWidget(widget.id)}
                  />
                  <div>
                    <div className="font-medium text-slate-900">
                      {widget.title}
                    </div>
                    <p className="text-sm text-slate-600">
                      {widget.description}
                    </p>
                  </div>
                </label>
              );
            })}
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>
            </Dialog.Close>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default WidgetPickerModal;
