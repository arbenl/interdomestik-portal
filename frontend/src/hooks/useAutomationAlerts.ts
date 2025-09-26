import { useQuery } from '@tanstack/react-query';
import { collection, getDocs, limit, orderBy, query, type DocumentData } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';

export type AutomationAlert = {
  id: string;
  url: string;
  windowDays: number;
  count: number;
  status: string;
  severity: string;
  message: string;
  actor: string;
  createdAt: Date | null;
  acknowledged: boolean;
};

const MAX_ALERTS = 15;

function normalizeAlert(id: string, data: DocumentData): AutomationAlert {
  const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : null;
  return {
    id,
    url: typeof data.url === 'string' ? data.url : '',
    windowDays: Number.isFinite(data.windowDays) ? Number(data.windowDays) : 0,
    count: Number.isFinite(data.count) ? Number(data.count) : 0,
    status: typeof data.status === 'string' ? data.status : 'unknown',
    severity: typeof data.severity === 'string' ? data.severity : 'warning',
    message: typeof data.message === 'string' ? data.message : '',
    actor: typeof data.actor === 'string' ? data.actor : 'automation',
    createdAt,
    acknowledged: Boolean(data.acknowledged),
  };
}

export function useAutomationAlerts() {
  return useQuery<{ alerts: AutomationAlert[] }, Error>({
    queryKey: ['automationAlerts'],
    queryFn: async () => {
      const alertsQuery = query(
        collection(firestore, 'automationAlerts'),
        orderBy('createdAt', 'desc'),
        limit(MAX_ALERTS)
      );
      const snapshot = await getDocs(alertsQuery);
      const alerts = snapshot.docs.map(doc => normalizeAlert(doc.id, doc.data()));
      return { alerts };
    },
    staleTime: 30_000,
  });
}

export default useAutomationAlerts;
