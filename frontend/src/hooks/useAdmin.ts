import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';

export default function useAdmin() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!user) { setLoading(false); return; }
        // Force refresh to pick up latest custom claims from emulator
        await user.getIdToken(true);
        const idTokenResult = await user.getIdTokenResult();
        if (!cancelled) setIsAdmin(idTokenResult.claims.role === 'admin');
      } catch {
        if (!cancelled) setIsAdmin(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  return { isAdmin, loading };
}
