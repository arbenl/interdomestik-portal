import { useQuery } from '@tanstack/react-query';
import { collection, getDocs, limit, orderBy, query, type DocumentData } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';

export type AssistantTelemetryEntry = {
  id: string;
  uid: string;
  role: string;
  latencyMs: number;
  fallback: boolean;
  promptLength: number;
  createdAt: Date | null;
};

const MAX_ENTRIES = 50;

function normalizeEntry(id: string, data: DocumentData): AssistantTelemetryEntry {
  const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : null;
  return {
    id,
    uid: typeof data.uid === 'string' ? data.uid : '',
    role: typeof data.role === 'string' ? data.role : 'member',
    latencyMs: Number.isFinite(data.latencyMs) ? Number(data.latencyMs) : 0,
    fallback: Boolean(data.fallback),
    promptLength: Number.isFinite(data.promptLength) ? Number(data.promptLength) : 0,
    createdAt,
  };
}

export function useAssistantTelemetry() {
  return useQuery<{ entries: AssistantTelemetryEntry[] }, Error>({
    queryKey: ['assistantTelemetry'],
    queryFn: async () => {
      const telemetryQuery = query(
        collection(firestore, 'assistantTelemetry'),
        orderBy('createdAt', 'desc'),
        limit(MAX_ENTRIES)
      );
      const snapshot = await getDocs(telemetryQuery);
      const entries = snapshot.docs.map(doc => normalizeEntry(doc.id, doc.data()));
      return { entries };
    },
    staleTime: 30_000,
  });
}

export default useAssistantTelemetry;
