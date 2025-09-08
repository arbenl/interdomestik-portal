import { useState, useEffect } from 'react';
import { collection, query, getDocs, where, limit as qLimit } from 'firebase/firestore';
import { db } from '../firebase';
import type { Profile } from '../types';

export const useUsers = (opts?: { allowedRegions?: string[]; limit?: number }) => {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refreshSeq, setRefreshSeq] = useState(0);
  const allowedRegions = opts?.allowedRegions ?? [];
  const max = opts?.limit ?? 100;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const usersCollectionRef = collection(db, 'members');
        let qRef = query(usersCollectionRef, qLimit(max));
        if (Array.isArray(allowedRegions) && allowedRegions.length > 0) {
          // Firestore 'in' supports up to 10 values
          qRef = query(usersCollectionRef, where('region', 'in', allowedRegions.slice(0, 10)), qLimit(max));
        }
        const snap = await getDocs(qRef);
        if (cancelled) return;
        const usersData: Profile[] = snap.docs.map(d => ({ id: d.id, ...(d.data() as Profile) }));
        setUsers(usersData);
        setError(null);
      } catch (err) {
        if (!cancelled) setError(err as Error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [refreshSeq, JSON.stringify(allowedRegions), max]);

  const refresh = () => setRefreshSeq((n) => n + 1);

  return { users, loading, error, refresh };
};
