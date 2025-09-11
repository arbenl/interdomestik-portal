import { useEffect, useState } from 'react';
import { collection, onSnapshot, limit, orderBy, query } from 'firebase/firestore';
import type { CollectionReference, Query, QuerySnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import type { AuditLog } from '../types';
import { auditLogConverter, maybeWithConverter } from '../lib/converters';

export function useAuditLogs(max = 20) {
  const [items, setItems] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    const col = maybeWithConverter<AuditLog>(collection(db, 'audit_logs'), auditLogConverter) as unknown as CollectionReference<AuditLog>;
    const q = query(col, orderBy('ts', 'desc'), limit(max)) as Query<AuditLog>;
    const unsub = onSnapshot(q, (snap: QuerySnapshot<AuditLog>) => {
      const arr: AuditLog[] = snap.docs.map(d => ({ id: d.id, ...(d.data() as unknown as Omit<AuditLog, 'id'>) }));
      setItems(arr);
      setError(null);
      setLoading(false);
    }, (e: unknown) => {
      setError(e instanceof Error ? e : new Error(String(e)));
      setLoading(false);
    });
    return () => unsub();
  }, [max]);

  return { items, loading, error };
}

export default useAuditLogs;
