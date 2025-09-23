import { useQuery } from '@tanstack/react-query';
import { collection, getDocs, limit, query, orderBy } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { eventConverter, maybeWithConverter } from '@/lib/converters';

export function useEvents(max = 5) {
  return useQuery({
    queryKey: ['events', max],
    queryFn: async () => {
      const col = maybeWithConverter(collection(firestore, 'events'), eventConverter);
      const q = query(col, orderBy('startAt', 'desc'), limit(max));
      const snap = await getDocs(q);
      return snap.docs.map((d) => d.data());
    },
  });
}
