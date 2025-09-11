import { useState, useEffect } from 'react';
import { collection, query, getDocs, where, limit as qLimit, orderBy, startAfter } from 'firebase/firestore';
import type { QueryConstraint, DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import type { Profile } from '../types';

export const useUsers = (opts?: { allowedRegions?: string[]; limit?: number; region?: string | null; myOnlyUid?: string | null; status?: 'ALL'|'ACTIVE'|'INACTIVE'|'EXPIRED'; expiringDays?: number | null }) => {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refreshSeq, setRefreshSeq] = useState(0);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);
  const [cursors, setCursors] = useState<QueryDocumentSnapshot<DocumentData>[]>([]);
  const allowedRegionsInput = opts?.allowedRegions ?? [];
  const allowedRegions = allowedRegionsInput;
  const max = opts?.limit ?? 100;
  const regionFilter = opts?.region ?? null; // null => no explicit filter

  const myOnlyUid = opts?.myOnlyUid ?? null;
  const statusFilter = opts?.status ?? 'ALL';
  const expiringDays = opts?.expiringDays ?? null;
  const regionsKey = JSON.stringify(allowedRegionsInput);
  const regionKey = regionFilter || 'ALL';
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const usersCollectionRef = collection(db, 'members');
        const constraints: QueryConstraint[] = [];
        // Determine ordering based on filters
        const now = new Date();
        const expStart = new Date(now.getTime());
        const expEnd = expiringDays ? new Date(now.getTime() + expiringDays * 24 * 60 * 60 * 1000) : null;
        const useExpiringQuery = !!(expiringDays && (!regionFilter || regionFilter === 'ALL') && statusFilter === 'ALL' && !myOnlyUid);
        if (useExpiringQuery) {
          constraints.push(orderBy('expiresAt', 'asc'));
        } else {
          constraints.push(orderBy('createdAt', 'desc'));
        }
        // Agent mode: restrict to own members by agentId
        if (myOnlyUid) {
          constraints.push(where('agentId', '==', myOnlyUid));
        } else {
          // Region selection (admin or admin with region limits)
          if (regionFilter && regionFilter !== 'ALL') {
            constraints.push(where('region', '==', regionFilter));
          } else if (Array.isArray(allowedRegions) && allowedRegions.length > 0) {
            constraints.push(where('region', 'in', allowedRegions.slice(0, 10)));
          }
        }
        // Status filter on root doc
        if (statusFilter === 'ACTIVE') constraints.push(where('status', '==', 'active'));
        else if (statusFilter === 'EXPIRED') constraints.push(where('status', '==', 'expired'));
        else if (statusFilter === 'INACTIVE') constraints.push(where('status', '==', 'none'));
        if (useExpiringQuery && expEnd) {
          // Range on expiresAt (Dates are accepted by the SDK)
          constraints.push(where('expiresAt', '>=', expStart));
          constraints.push(where('expiresAt', '<=', expEnd));
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
  }, [refreshSeq, regionsKey, regionKey, max, allowedRegions, regionFilter, myOnlyUid, statusFilter, expiringDays]);

  const refresh = () => setRefreshSeq((n) => n + 1);

  const nextPage = async () => {
    try {
      setLoading(true);
      const usersCollectionRef = collection(db, 'members');
      const now = new Date();
      const expStart = new Date(now.getTime());
      const expEnd = expiringDays ? new Date(now.getTime() + expiringDays * 24 * 60 * 60 * 1000) : null;
      const useExpiringQuery = !!(expiringDays && (!regionFilter || regionFilter === 'ALL') && statusFilter === 'ALL' && !myOnlyUid);
      const constraints: QueryConstraint[] = [useExpiringQuery ? orderBy('expiresAt', 'asc') : orderBy('createdAt', 'desc')];
      if (myOnlyUid) {
        constraints.push(where('agentId', '==', myOnlyUid));
      } else {
        if (regionFilter && regionFilter !== 'ALL') {
          constraints.push(where('region', '==', regionFilter));
        } else if (Array.isArray(allowedRegions) && allowedRegions.length > 0) {
          constraints.push(where('region', 'in', allowedRegions.slice(0, 10)));
        }
      }
      if (statusFilter === 'ACTIVE') constraints.push(where('status', '==', 'active'));
      else if (statusFilter === 'EXPIRED') constraints.push(where('status', '==', 'expired'));
      else if (statusFilter === 'INACTIVE') constraints.push(where('status', '==', 'none'));
      if (cursors.length > 0) {
        constraints.push(startAfter(cursors[cursors.length - 1]));
      }
      if (useExpiringQuery && expEnd) {
        constraints.push(where('expiresAt', '>=', expStart));
        constraints.push(where('expiresAt', '<=', expEnd));
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
      const now = new Date();
      const expStart = new Date(now.getTime());
      const expEnd = expiringDays ? new Date(now.getTime() + expiringDays * 24 * 60 * 60 * 1000) : null;
      const useExpiringQuery = !!(expiringDays && (!regionFilter || regionFilter === 'ALL') && statusFilter === 'ALL' && !myOnlyUid);
      const constraints: QueryConstraint[] = [useExpiringQuery ? orderBy('expiresAt', 'asc') : orderBy('createdAt', 'desc')];
      if (myOnlyUid) {
        constraints.push(where('agentId', '==', myOnlyUid));
      } else {
        if (regionFilter && regionFilter !== 'ALL') {
          constraints.push(where('region', '==', regionFilter));
        } else if (Array.isArray(allowedRegions) && allowedRegions.length > 0) {
          constraints.push(where('region', 'in', allowedRegions.slice(0, 10)));
        }
      }
      if (statusFilter === 'ACTIVE') constraints.push(where('status', '==', 'active'));
      else if (statusFilter === 'EXPIRED') constraints.push(where('status', '==', 'expired'));
      else if (statusFilter === 'INACTIVE') constraints.push(where('status', '==', 'none'));
      // To go back, drop the last cursor and use the new last as startAfter baseline.
      const newStack = cursors.slice(0, -1);
      const startCursor = newStack[newStack.length - 1];
      if (startCursor) {
        constraints.push(startAfter(startCursor));
      }
      if (useExpiringQuery && expEnd) {
        constraints.push(where('expiresAt', '>=', expStart));
        constraints.push(where('expiresAt', '<=', expEnd));
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
