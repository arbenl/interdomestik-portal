import { useState, useEffect } from 'react';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import type { Profile, Membership } from '../types';

export const useMemberProfile = (uid: string | undefined) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [activeMembership, setActiveMembership] = useState<Membership | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!uid) {
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      try {
        const profileDocRef = doc(db, 'members', uid);
        const profileSnap = await getDoc(profileDocRef);

        if (profileSnap.exists()) {
          setProfile({ id: profileSnap.id, ...(profileSnap.data() as Profile) });
        } else {
          // Handle case where user is authenticated but has no profile data yet
          setProfile(null);
        }

        const membershipCollectionRef = collection(db, 'members', uid, 'memberships');
        const q = query(membershipCollectionRef, where('status', '==', 'active'));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          // Assuming only one active membership at a time
          const d = querySnapshot.docs[0];
          setActiveMembership({ id: d.id, ...(d.data() as Membership) });
        } else {
          setActiveMembership(null);
        }

      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [uid]);

  return { profile, activeMembership, loading, error };
};
