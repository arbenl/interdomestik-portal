import { useState, useEffect, useMemo } from 'react';
import { collection, query, getDocs, where, limit as qLimit, orderBy, startAfter } from 'firebase/firestore';
import type { QueryConstraint, DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import type { Profile } from '../types';

export const useUsers = (opts?: { allowedRegions?: string[]; limit?: number; region?: string | null }) => {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refreshSeq, setRefreshSeq] = useState(0);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);
  const [cursors, setCursors] = useState<QueryDocumentSnapshot<DocumentData>[]>([]);
  const allowedRegionsInput = opts?.allowedRegions ?? [];
  const allowedRegions = useMemo(() => allowedRegionsInput, [allowedRegionsInput.join('|')]);
  const max = opts?.limit ?? 100;
  const regionFilter = opts?.region ?? null; // null => no explicit filter

  const regionsKey = JSON.stringify(allowedRegions);
  const regionKey = regionFilter || 'ALL';
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const usersCollectionRef = collection(db, 'members');
        const constraints: QueryConstraint[] = [];
        // Preferred sort for stable pagination
        constraints.push(orderBy('createdAt', 'desc'));
        // Region selection: if a specific region is chosen, use equality filter.
        if (regionFilter && regionFilter !== 'ALL') {
          constraints.push(where('region', '==', regionFilter));
        } else if (Array.isArray(allowedRegions) && allowedRegions.length > 0) {
          // Viewer is restricted to specific regions (agent/admin with limited regions)
          constraints.push(where('region', 'in', allowedRegions.slice(0, 10)));
        }
        constraints.push(qLimit(max + 1)); // fetch one extra to detect next page
        const qRef = query(usersCollectionRef, ...constraints);
        const snap = await getDocs(qRef);
        if (cancelled) return;
        const docs = snap.docs;
        const pageDocs = docs.slice(0, Math.min(docs.length, max));
        const usersData: Profile[] = pageDocs.map(d => ({ id: d.id, ...(d.data() as Profile) }));
        setUsers(usersData);
        setHasNext(docs.length > max);
        setHasPrev(false);
        setPage(1);
        setCursors(pageDocs.length > 0 ? [pageDocs[pageDocs.length - 1]] : []);
        setError(null);
      } catch (err) {
        if (!cancelled) setError(err as Error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [refreshSeq, regionsKey, regionKey, max, allowedRegions, regionFilter]);

  const refresh = () => setRefreshSeq((n) => n + 1);

  const nextPage = async () => {
    try {
      setLoading(true);
      const usersCollectionRef = collection(db, 'members');
      const constraints: QueryConstraint[] = [orderBy('createdAt', 'desc')];
      if (regionFilter && regionFilter !== 'ALL') {
        constraints.push(where('region', '==', regionFilter));
      } else if (Array.isArray(allowedRegions) && allowedRegions.length > 0) {
        constraints.push(where('region', 'in', allowedRegions.slice(0, 10)));
      }
      if (cursors.length > 0) {
        constraints.push(startAfter(cursors[cursors.length - 1]));
      }
      constraints.push(qLimit(max + 1));
      const qRef = query(usersCollectionRef, ...constraints);
      const snap = await getDocs(qRef);
      const docs = snap.docs;
      const pageDocs = docs.slice(0, Math.min(docs.length, max));
      const usersData: Profile[] = pageDocs.map(d => ({ id: d.id, ...(d.data() as Profile) }));
      setUsers(usersData);
      setHasNext(docs.length > max);
      // Track cursor as the last doc of the previous page for prev navigation
      if (pageDocs.length > 0) {
        setCursors(prev => [...prev, pageDocs[pageDocs.length - 1]]);
        setHasPrev(true);
        setPage(p => p + 1);
      } else {
        setHasPrev(cursors.length > 0);
      }
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  const prevPage = async () => {
    try {
      if (cursors.length === 0) return; // already at first page
      setLoading(true);
      const usersCollectionRef = collection(db, 'members');
      const constraints: QueryConstraint[] = [orderBy('createdAt', 'desc')];
      if (regionFilter && regionFilter !== 'ALL') {
        constraints.push(where('region', '==', regionFilter));
      } else if (Array.isArray(allowedRegions) && allowedRegions.length > 0) {
        constraints.push(where('region', 'in', allowedRegions.slice(0, 10)));
      }
      // To go back, drop the last cursor and use the new last as startAfter baseline.
      const newStack = cursors.slice(0, -1);
      const startCursor = newStack[newStack.length - 1];
      if (startCursor) {
        constraints.push(startAfter(startCursor));
      }
      constraints.push(qLimit(max + 1));
      const qRef = query(usersCollectionRef, ...constraints);
      const snap = await getDocs(qRef);
      const docs = snap.docs;
      const pageDocs = docs.slice(0, Math.min(docs.length, max));
      const usersData: Profile[] = pageDocs.map(d => ({ id: d.id, ...(d.data() as Profile) }));
      setUsers(usersData);
      setHasNext(docs.length > max);
      setCursors(newStack);
      setHasPrev(newStack.length > 0);
      setPage(p => Math.max(1, p - 1));
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  return { users, loading, error, refresh, nextPage, prevPage, hasNext, hasPrev, page };
};
