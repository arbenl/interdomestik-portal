import { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import type { CollectionReference, Query, QuerySnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import type { Invoice } from '../types';
import { invoiceConverter, maybeWithConverter } from '../lib/converters';

// Invoice type is defined in src/types

export function useInvoices(uid?: string) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!uid) { setInvoices([]); setLoading(false); return; }
    setLoading(true); setError(null);
    const col = maybeWithConverter<Invoice>(collection(db, 'billing', uid, 'invoices'), invoiceConverter) as unknown as CollectionReference<Invoice>;
    const qy = query(col, orderBy('created', 'desc')) as Query<Invoice>;
    const unsub = onSnapshot(qy, (snap: QuerySnapshot<Invoice>) => {
      const items: Invoice[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as unknown as Omit<Invoice, 'id'>) }));
      setInvoices(items);
      setLoading(false);
      setError(null);
    }, (e: unknown) => {
      setError(e instanceof Error ? e : new Error(String(e)));
      setLoading(false);
    });
    return () => unsub();
  }, [uid]);

  // Live subscription; refresh is a no-op retained for API compatibility
  const refresh = () => void 0;

  return { invoices, loading, error, refresh };
}

export default useInvoices;
