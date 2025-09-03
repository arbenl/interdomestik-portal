import { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

export const useMembershipHistory = (uid: string | undefined) => {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!uid) {
      setLoading(false);
      return;
    }

    const fetchHistory = async () => {
      try {
        const historyCollectionRef = collection(db, 'members', uid, 'memberships');
        const q = query(historyCollectionRef, orderBy('year', 'desc'));
        const querySnapshot = await getDocs(q);
        
        const historyData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        setHistory(historyData);

      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [uid]);

  return { history, loading, error };
};
