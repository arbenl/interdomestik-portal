import { useState, useEffect } from 'react';
import { doc, onSnapshot, collection, query, where, orderBy, limit } from 'firebase/firestore';
import type { DocumentReference, DocumentSnapshot, CollectionReference, Query, QuerySnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import type { Profile, Membership } from '../types';
import { profileConverter, membershipConverter, maybeWithConverter } from '../lib/converters';

export const useMemberProfile = (uid: string | undefined) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [activeMembership, setActiveMembership] = useState<Membership | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!uid) { setLoading(false); setProfile(null); setActiveMembership(null); return; }
    setLoading(true); setError(null);

    const profileDocRef = maybeWithConverter<Profile>(doc(db, 'members', uid), profileConverter) as unknown as DocumentReference<Profile>;
    const unsubProfile = onSnapshot(profileDocRef, (snap: DocumentSnapshot<Profile>) => {
      if (snap.exists()) {
        setProfile({ id: snap.id, ...(snap.data() as unknown as Profile) });
      } else {
        setProfile(null);
      }
      setLoading(false);
    }, (e: unknown) => {
      setError(e as Error);
      setLoading(false);
    });

    const membershipCollectionRef = maybeWithConverter<Membership>(collection(db, 'members', uid, 'memberships'), membershipConverter) as unknown as CollectionReference<Membership>;
    const qy = query(
      membershipCollectionRef,
      where('status', '==', 'active'),
      orderBy('year', 'desc'),
      limit(1)
    ) as Query<Membership>;
    const unsubActive = onSnapshot(qy, (snap: QuerySnapshot<Membership>) => {
      if (!snap.empty) {
        const d = snap.docs[0];
        setActiveMembership({ id: d.id, ...(d.data() as unknown as Membership) });
      } else {
        setActiveMembership(null);
      }
    }, (e: unknown) => {
      setError(e as Error);
    });

    return () => { unsubProfile(); unsubActive(); };
  }, [uid]);

  return { profile, activeMembership, loading, error };
};
