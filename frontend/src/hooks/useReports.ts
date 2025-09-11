import { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query, where, limit } from 'firebase/firestore';
import type { CollectionReference, Query, QuerySnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import type { MonthlyReport } from '../types';
import { reportConverter, maybeWithConverter } from '../lib/converters';

export function useReports(count: number = 6) {
  const [items, setItems] = useState<MonthlyReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  useEffect(() => {
    setLoading(true); setError(null);
    const col = maybeWithConverter<MonthlyReport>(collection(db, 'reports'), reportConverter) as unknown as CollectionReference<MonthlyReport>;
    const qy = query(col, where('type', '==', 'monthly'), orderBy('updatedAt', 'desc'), limit(count)) as Query<MonthlyReport>;
    const unsub = onSnapshot(qy, (snap: QuerySnapshot<MonthlyReport>) => {
      const arr: MonthlyReport[] = snap.docs.map((d) => {
        const data = d.data() as unknown as Partial<MonthlyReport> & { byRegion?: Record<string, number>; byMethod?: Record<string, number> };
        return { id: d.id, type: 'monthly', month: data.month || '', total: data.total, revenue: data.revenue, byRegion: data.byRegion, byMethod: data.byMethod, updatedAt: data.updatedAt };
      });
      setItems(arr);
      setLoading(false);
    }, (e: unknown) => {
      setError(e as Error);
      setLoading(false);
    });
    return () => unsub();
  }, [count]);
  return { items, loading, error };
}

export default useReports;
