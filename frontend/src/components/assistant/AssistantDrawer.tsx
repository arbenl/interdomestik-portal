import { useMemo, useState } from 'react';
import type { AssistantMessage } from '@/hooks/usePortalAssistant';

interface AssistantDrawerProps {
  open: boolean;
  onClose: () => void;
  messages: AssistantMessage[];
  onSend: (prompt: string) => Promise<void>;
  loading: boolean;
  error?: string;
}

export function AssistantDrawer({
  open,
  onClose,
  messages,
  onSend,
  loading,
  error,
}: AssistantDrawerProps) {
  const [prompt, setPrompt] = useState('');

  const followUps = useMemo(() => {
    const lastAssistant = [...messages]
      .reverse()
      .find((msg) => msg.role === 'assistant');
    return lastAssistant?.followUps ?? [];
  }, [messages]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = prompt.trim();
    if (!trimmed || loading) return;
    setPrompt('');
    await onSend(trimmed);
  };

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-40 flex justify-end bg-black/20"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="h-full w-full max-w-md bg-white shadow-xl flex flex-col"
        data-testid="assistant-drawer"
      >
        <header className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-gray-900">
              Portal Assistant
            </p>
            <p className="text-xs text-gray-500">
              Answers, reminders, and shortcuts
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100"
            aria-label="Close assistant"
          >
            Close
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 text-sm text-gray-700">
          {messages.length === 0 ? (
            <p data-testid="assistant-placeholder">
              Assistant responses will appear here. Try asking about renewals,
              billing, or events.
            </p>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'assistant' ? 'justify-start' : 'justify-end'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 ${message.role === 'assistant' ? 'bg-indigo-50 text-indigo-900' : 'bg-indigo-600 text-white'}`}
                >
                  <p className="whitespace-pre-line text-sm">
                    {message.content}
                  </p>
                  {message.followUps && message.followUps.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {message.followUps.map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          className="rounded-full border border-indigo-300 px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-100"
                          onClick={() => {
                            setPrompt('');
                            void onSend(suggestion);
                          }}
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            ))
          )}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>
        <footer className="border-t border-gray-200 px-4 py-3">
          <form className="flex gap-2" onSubmit={handleSubmit}>
            <label htmlFor="assistantPrompt" className="sr-only">
              Ask the assistant a question
            </label>
            <input
              id="assistantPrompt"
              name="assistantPrompt"
              type="text"
              placeholder="Ask about renewals or billing"
              className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              disabled={loading}
            />
            <button
              type="submit"
              className="rounded bg-indigo-600 px-3 py-2 text-sm font-medium text-white disabled:bg-indigo-300"
              disabled={loading || !prompt.trim()}
            >
              {loading ? 'Sending…' : 'Send'}
            </button>
          </form>
          {followUps.length > 0 ? (
            <p className="mt-2 text-xs text-gray-500">
              Try one of the follow-up shortcuts above or enter your own
              question.
            </p>
          ) : (
            <p className="mt-2 text-xs text-gray-500">
              Ask about renewals, billing, events, exports, or security.
            </p>
          )}
        </footer>
      </div>
    </div>
  );
}

export default AssistantDrawer;
