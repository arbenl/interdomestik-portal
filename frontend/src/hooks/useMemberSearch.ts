import { useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import type { Profile } from '../types';

function isMemberNo(s: string) {
  return /^INT-\d{4}-\d{6}$/i.test(s.trim());
}

export function useMemberSearch() {
  const [results, setResults] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function search(input: string) {
    const term = input.trim();
    if (!term) { setResults([]); setError(null); return; }
    setLoading(true); setError(null);
    try {
      let qRef;
      if (term.includes('@')) {
        // Email exact match; store lowercased email in members
        qRef = query(collection(db, 'members'), where('email', '==', term.toLowerCase()));
      } else if (isMemberNo(term)) {
        qRef = query(collection(db, 'members'), where('memberNo', '==', term.toUpperCase()));
      } else {
        // Fallback: try exact name match (best-effort)
        qRef = query(collection(db, 'members'), where('name', '==', term));
      }
      const snap = await getDocs(qRef);
      const items: Profile[] = snap.docs.map(d => ({ id: d.id, ...(d.data() as Profile) }));
      setResults(items);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  function clear() { setResults([]); setError(null); }

  return { results, loading, error, search, clear };
}

export default useMemberSearch;

