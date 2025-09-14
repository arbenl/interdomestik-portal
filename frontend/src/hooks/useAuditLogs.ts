import { useQuery } from '@tanstack/react-query';
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { firestore } from '@/firebase';
import { auditLogConverter } from '@/lib/converters';

export function useAuditLogs(max = 20) {
  return useQuery({
    queryKey: ['auditLogs', max],
    queryFn: async () => {
      const col = collection(firestore, 'audit_logs').withConverter(auditLogConverter);
      const q = query(col, orderBy('ts', 'desc'), limit(max));
      const snap = await getDocs(q);
      return snap.docs.map(d => d.data());
    },
  });
}
