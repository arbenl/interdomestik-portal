import { useQuery } from '@tanstack/react-query';
import { collection, getDocs, limit, query, orderBy, where } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { reportConverter } from '@/lib/converters';

export function useReports(count: number = 6) {
  return useQuery({
    queryKey: ['reports', count],
    queryFn: async () => {
      const col = collection(firestore, 'reports').withConverter(reportConverter);
      const q = query(col, where('type', '==', 'monthly'), orderBy('updatedAt', 'desc'), limit(count));
      const snap = await getDocs(q);
      return snap.docs.map((d) => d.data());
    },
  });
}
