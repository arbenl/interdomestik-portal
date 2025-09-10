import { useEffect, useState } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase';
import type { Invoice } from '../types';

// Invoice type is defined in src/types

export function useInvoices(uid?: string) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  async function fetchNow(signal?: { cancelled?: boolean }) {
    if (!uid) { setInvoices([]); return; }
    setLoading(true); setError(null);
    try {
      const qy = query(
        collection(db, 'billing', uid, 'invoices'),
        orderBy('created', 'desc')
      );
      const snap = await getDocs(qy);
      if (signal?.cancelled) return;
      const items: Invoice[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Invoice, 'id'>) }));
      setInvoices(items);
    } catch (e) {
      if (!signal?.cancelled) setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      if (!signal?.cancelled) setLoading(false);
    }
  }

  useEffect(() => {
    const sig = { cancelled: false } as { cancelled: boolean };
    fetchNow(sig);
    return () => { sig.cancelled = true; };
  }, [uid]);

  const refresh = () => fetchNow();

  return { invoices, loading, error, refresh };
}

export default useInvoices;
