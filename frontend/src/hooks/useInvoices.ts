import { useEffect, useState } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase';
import type { Invoice } from '../types';

// Invoice type is defined in src/types

export function useInvoices(uid?: string) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!uid) { setInvoices([]); return; }
      setLoading(true); setError(null);
      try {
        const q = query(
          collection(db, 'billing', uid, 'invoices'),
          orderBy('created', 'desc')
        );
        const snap = await getDocs(q);
        if (cancelled) return;
        const items: Invoice[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Invoice, 'id'>) }));
        setInvoices(items);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e : new Error(String(e)));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => { cancelled = true; };
  }, [uid]);

  return { invoices, loading, error };
}

export default useInvoices;
