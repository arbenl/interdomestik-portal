import { useEffect, useState } from 'react';
import { collection, getDocs, orderBy, query, where, limit } from 'firebase/firestore';
import { db } from '../firebase';

export type MonthlyReport = {
  id: string;
  type: 'monthly';
  month: string; // YYYY-MM
  total?: number;
  revenue?: number;
  updatedAt?: { seconds: number };
};

export function useReports(count: number = 6) {
  const [items, setItems] = useState<MonthlyReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true); setError(null);
      try {
        const qy = query(collection(db, 'reports'), where('type', '==', 'monthly'), orderBy('updatedAt', 'desc'), limit(count));
        const snap = await getDocs(qy);
        if (cancelled) return;
        const arr = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as MonthlyReport[];
        setItems(arr);
      } catch (e) {
        if (!cancelled) setError(e as Error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => { cancelled = true; };
  }, [count]);
  return { items, loading, error };
}

export default useReports;

