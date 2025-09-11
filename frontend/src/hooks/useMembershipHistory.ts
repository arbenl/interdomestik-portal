import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import type { CollectionReference, Query, QuerySnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import type { Membership } from '../types';
import { membershipConverter, maybeWithConverter } from '../lib/converters';

export const useMembershipHistory = (uid: string | undefined) => {
  const [history, setHistory] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!uid) { setLoading(false); setHistory([]); return; }
    setLoading(true); setError(null);
    const historyCollectionRef = maybeWithConverter<Membership>(collection(db, 'members', uid, 'memberships'), membershipConverter) as unknown as CollectionReference<Membership>;
    const qy = query(historyCollectionRef, orderBy('year', 'desc')) as Query<Membership>;
    const unsub = onSnapshot(qy, (snap: QuerySnapshot<Membership>) => {
      const historyData: Membership[] = snap.docs.map(d => ({ id: d.id, ...(d.data() as unknown as Membership) }));
      setHistory(historyData);
      setLoading(false);
      setError(null);
    }, (e: unknown) => {
      setError(e as Error);
      setLoading(false);
    });
    return () => unsub();
  }, [uid]);

  return { history, loading, error };
};
