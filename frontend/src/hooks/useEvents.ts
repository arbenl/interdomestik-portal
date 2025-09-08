import { collection, getDocs, orderBy, query, limit } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { db } from '../firebase';
import type { EventItem } from '../types';

export function useEvents(max = 5) {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const q = query(collection(db, 'events'), orderBy('startAt', 'desc'), limit(max));
        const snap = await getDocs(q);
        setEvents(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<EventItem, 'id'>) })));
      } catch (e) {
        setError(e as Error);
      } finally {
        setLoading(false);
      }
    })();
  }, [max]);

  return { events, loading, error };
}
