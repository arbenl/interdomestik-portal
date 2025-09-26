import { useQuery } from '@tanstack/react-query';
import { collection, getDocs, limit, orderBy, query, type DocumentData } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';

export type AssistantSession = {
  uid: string;
  role: string;
  lastPrompt: string;
  updatedAt: Date | null;
};

const MAX_SESSIONS = 25;

function normalizeSession(id: string, data: DocumentData): AssistantSession {
  const updatedAt = data.updatedAt?.toDate ? data.updatedAt.toDate() : null;
  return {
    uid: id,
    role: typeof data.role === 'string' ? data.role : 'member',
    lastPrompt: typeof data.lastPrompt === 'string' ? data.lastPrompt : '',
    updatedAt,
  };
}

export function useAssistantSessions() {
  return useQuery<{ sessions: AssistantSession[] }, Error>({
    queryKey: ['assistantSessions'],
    queryFn: async () => {
      const sessionsQuery = query(
        collection(firestore, 'assistantSessions'),
        orderBy('updatedAt', 'desc'),
        limit(MAX_SESSIONS)
      );
      const snapshot = await getDocs(sessionsQuery);
      const sessions = snapshot.docs.map(doc => normalizeSession(doc.id, doc.data()));
      return { sessions };
    },
    staleTime: 60_000,
  });
}

export default useAssistantSessions;
