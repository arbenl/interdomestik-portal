import { useEffect, useState } from 'react';
import { collection, getDocs, orderBy, query, where, limit } from 'firebase/firestore';
import { db } from '../firebase';
import type { MonthlyReport } from '../types';

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
        const arr: MonthlyReport[] = snap.docs.map((d) => {
          const data = d.data() as Partial<MonthlyReport> & { byRegion?: Record<string, number>; byMethod?: Record<string, number> };
          return { id: d.id, type: 'monthly', month: data.month || '', total: data.total, revenue: data.revenue, byRegion: data.byRegion, byMethod: data.byMethod, updatedAt: data.updatedAt };
        });
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
