import { collection, getDocs, limit, query, orderBy } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { db } from '../firebase';
import type { Profile } from '../types';

export type DirectoryItem = Pick<Profile, 'name' | 'region'> & { id: string };

export function useDirectory(max = 5) {
  const [members, setMembers] = useState<DirectoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  useEffect(() => {
    (async () => {
      try {
        const q = query(collection(db, 'members'), orderBy('createdAt', 'desc'), limit(max));
        const snap = await getDocs(q);
        setMembers(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Profile) })));
      } catch (e) {
        setError(e as Error);
      } finally {
        setLoading(false);
      }
    })();
  }, [max]);
  return { members, loading, error };
}
