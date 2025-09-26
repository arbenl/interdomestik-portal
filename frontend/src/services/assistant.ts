import callFn from '@/services/functionsClient';

export type AssistantFollowUp = string;

export type AssistantReply = {
  reply: string;
  followUps: AssistantFollowUp[];
  messageRef?: string;
  generatedAt?: string;
};

export async function askAssistant(prompt: string): Promise<AssistantReply> {
  return await callFn<AssistantReply, { prompt: string }>('startAssistantSuggestion', { prompt });
}
