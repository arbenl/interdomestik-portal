import { useEffect, useState } from 'react';
import { collection, getDocs, limit, orderBy, query, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';

export type AuditLog = {
  id: string;
  action: string;
  actor?: string;
  target?: string;
  role?: string;
  allowedRegions?: string[];
  year?: number;
  amount?: number;
  currency?: string;
  method?: string;
  ts?: Timestamp;
};

export function useAuditLogs(max = 20) {
  const [items, setItems] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const q = query(collection(db, 'audit_logs'), orderBy('ts', 'desc'), limit(max));
        const snap = await getDocs(q);
        if (cancelled) return;
        const arr: AuditLog[] = snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<AuditLog, 'id'>) }));
        setItems(arr);
        setError(null);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e : new Error(String(e)));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [max]);

  return { items, loading, error };
}

export default useAuditLogs;

