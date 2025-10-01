import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { askAssistant, type AssistantReply } from '@/services/assistant';
import { useAuth } from '@/hooks/useAuth';

export type AssistantMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  followUps?: string[];
  createdAt: string;
};

interface UsePortalAssistantOptions {
  enabled: boolean;
}

interface UsePortalAssistantResult {
  enabled: boolean;
  active: boolean;
  messages: AssistantMessage[];
  loading: boolean;
  error?: string;
  ask: (prompt: string) => Promise<void>;
  clearError: () => void;
}

const formatDate = () => new Date().toISOString();
const generateId = () => {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }
  return `id-${Math.random().toString(36).slice(2, 10)}`;
};

export function usePortalAssistant({
  enabled,
}: UsePortalAssistantOptions): UsePortalAssistantResult {
  const { user } = useAuth();
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!enabled) {
      setMessages([]);
      setError(undefined);
    }
  }, [enabled]);

  const mutation = useMutation({
    mutationFn: async (prompt: string) => {
      const result = await askAssistant(prompt);
      return result;
    },
    onError: (err: unknown) => {
      setError(
        err instanceof Error
          ? err.message
          : 'Assistant is temporarily unavailable.'
      );
    },
    onSuccess: (result: AssistantReply) => {
      setMessages((prev) => {
        const next: AssistantMessage[] = [...prev];
        const assistantMessage: AssistantMessage = {
          id: `assistant-${result.messageRef ?? generateId()}`,
          role: 'assistant',
          content: result.reply,
          followUps: result.followUps,
          createdAt: result.generatedAt ?? formatDate(),
        };
        next.push(assistantMessage);
        return next.slice(-20);
      });
    },
  });

  const ask = useCallback(
    async (prompt: string) => {
      if (!enabled || !user) return;
      const trimmed = prompt.trim();
      if (!trimmed) {
        setError('Enter a question to get started.');
        return;
      }
      setError(undefined);
      setMessages((prev) =>
        prev.concat({
          id: `user-${generateId()}`,
          role: 'user',
          content: trimmed,
          createdAt: formatDate(),
        })
      );
      await mutation.mutateAsync(trimmed);
    },
    [enabled, mutation, user]
  );

  const canAccess = Boolean(user);

  return useMemo(
    () => ({
      enabled: canAccess,
      active: enabled && canAccess,
      messages,
      loading: mutation.isPending,
      error,
      ask,
      clearError: () => setError(undefined),
    }),
    [ask, enabled, error, messages, mutation.isPending, canAccess]
  );
}

export default usePortalAssistant;
