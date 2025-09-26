import { useQuery } from '@tanstack/react-query';
import { collection, getDocs, limit, orderBy, query, type DocumentData } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';

export type AutomationLog = {
  id: string;
  url: string;
  windowDays: number;
  count: number;
  status: string;
  actor: string;
  dispatchedAt: Date | null;
};

const MAX_LOGS = 20;

function normalizeLog(id: string, data: DocumentData): AutomationLog {
  const dispatchedAt = data.dispatchedAt?.toDate ? data.dispatchedAt.toDate() : null;
  return {
    id,
    url: typeof data.url === 'string' ? data.url : '',
    windowDays: Number.isFinite(data.windowDays) ? Number(data.windowDays) : 0,
    count: Number.isFinite(data.count) ? Number(data.count) : 0,
    status: typeof data.status === 'string' ? data.status : 'unknown',
    actor: typeof data.actor === 'string' ? data.actor : 'automation',
    dispatchedAt,
  };
}

export function useAutomationLogs() {
  return useQuery<{ logs: AutomationLog[] }, Error>({
    queryKey: ['automationLogs'],
    queryFn: async () => {
      const logsQuery = query(
        collection(firestore, 'automationLogs'),
        orderBy('dispatchedAt', 'desc'),
        limit(MAX_LOGS)
      );
      const snapshot = await getDocs(logsQuery);
      const logs = snapshot.docs.map(doc => normalizeLog(doc.id, doc.data())).filter(log => log.url);
      return { logs };
    },
  });
}

export default useAutomationLogs;
