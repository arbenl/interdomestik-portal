import { useMutation } from '@tanstack/react-query';
import { collection, getDocs, limit, orderBy, query, startAt, endAt, where } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import type { Profile } from '@/types';

function isMemberNo(s: string) {
  return /^INT-\d{4}-\d{6}$/i.test(s.trim());
}

export function useMemberSearch() {
  return useMutation({
    mutationFn: async (input: string) => {
      const term = input.trim();
      if (!term) { return []; }
      let qRef;
      if (term.includes('@')) {
        // Email exact match; store lowercased email in members
        qRef = query(collection(firestore, 'members'), where('email', '==', term.toLowerCase()));
      } else if (isMemberNo(term)) {
        qRef = query(collection(firestore, 'members'), where('memberNo', '==', term.toUpperCase()));
      } else {
        // Name prefix search using normalized field
        const prefix = term.toLowerCase();
        // Allow 1+ char searches; use smaller page size for very short prefixes
        const col = collection(firestore, 'members');
        const page = prefix.length <= 1 ? 10 : 20;
        // order by nameLower and bound by prefix range
        qRef = query(col, orderBy('nameLower'), startAt(prefix), endAt(prefix + '\uf8ff'), limit(page));
      }
      const snap = await getDocs(qRef);
      const items: Profile[] = snap.docs.map(d => ({ id: d.id, ...(d.data() as Profile) }));
      // Ensure alphabetical by name even for exact match branches
      items.sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }));
      return items;
    },
  });
}