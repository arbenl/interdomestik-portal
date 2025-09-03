import { useState, useEffect } from 'react';
import { collection, query, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

export const useUsers = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const usersCollectionRef = collection(db, 'members');
        const q = query(usersCollectionRef);
        const querySnapshot = await getDocs(q);
        
        const usersData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        setUsers(usersData);

      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  return { users, loading, error };
};
