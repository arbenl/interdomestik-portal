import { collection, onSnapshot, orderBy, query, limit } from 'firebase/firestore';
import type { CollectionReference, Query, QuerySnapshot } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { db } from '../firebase';
import type { EventItem } from '../types';
import { eventConverter, maybeWithConverter } from '../lib/converters';

export function useEvents(max = 5) {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const col = maybeWithConverter<EventItem>(collection(db, 'events'), eventConverter) as unknown as CollectionReference<EventItem>;
    const q = query(col, orderBy('startAt', 'desc'), limit(max)) as Query<EventItem>;
    setLoading(true); setError(null);
    const unsub = onSnapshot(q, (snap: QuerySnapshot<EventItem>) => {
      setEvents(snap.docs.map((d) => ({ id: d.id, ...(d.data() as unknown as Omit<EventItem, 'id'>) })));
      setLoading(false);
    }, (e: unknown) => {
      setError(e as Error);
      setLoading(false);
    });
    return () => unsub();
  }, [max]);

  return { events, loading, error };
}
