import { useQuery } from '@tanstack/react-query';
import { collection, getDocs, limit, query, orderBy } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import type { Profile } from '@/types';

export type DirectoryItem = Pick<Profile, 'name' | 'region'> & { id: string };

export function useDirectory(max = 5) {
  return useQuery({
    queryKey: ['directory', max],
    queryFn: async () => {
      const q = query(
        collection(firestore, 'members'),
        orderBy('createdAt', 'desc'),
        limit(max)
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Profile) }));
    },
  });
}
