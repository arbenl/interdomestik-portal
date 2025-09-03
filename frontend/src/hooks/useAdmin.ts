import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function useAdmin() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      user.getIdTokenResult().then((idTokenResult) => {
        setIsAdmin(idTokenResult.claims.role === 'admin');
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [user]);

  return { isAdmin, loading };
}
