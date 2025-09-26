import { useEffect, useState } from 'react';
import usePortalAssistant from '@/hooks/usePortalAssistant';
import AssistantDrawer from './AssistantDrawer';

export function AssistantLauncher() {
  const [open, setOpen] = useState(false);
  const assistant = usePortalAssistant({ enabled: open });

  useEffect(() => {
    if (!open) {
      assistant.clearError();
    }
  }, [assistant, open]);

  if (!assistant.enabled) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        data-testid="assistant-launcher"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-30 flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-lg hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        aria-label="Open portal assistant"
      >
        <span
          aria-hidden="true"
          className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-bold text-indigo-600"
        >
          ?
        </span>
        <span>Assistant</span>
      </button>
      <AssistantDrawer
        open={open}
        onClose={() => setOpen(false)}
        messages={assistant.messages}
        onSend={assistant.ask}
        loading={assistant.loading}
        error={assistant.error}
      />
    </>
  );
}

export default AssistantLauncher;
