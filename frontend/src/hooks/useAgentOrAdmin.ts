import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function useAgentOrAdmin() {
  const { user } = useAuth();
  const [role, setRole] = useState<string | null>(null);
  const [allowedRegions, setAllowedRegions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!user) {
        if (mounted) setLoading(false);
        return;
      }
      const token = await user.getIdTokenResult();
      if (!mounted) return;
      setRole((token.claims as any).role || null);
      setAllowedRegions(((token.claims as any).allowedRegions as string[] | undefined) || []);
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [user]);

  const isAdmin = role === 'admin';
  const isAgent = role === 'agent';
  const canRegister = isAdmin || isAgent;
  return { isAdmin, isAgent, canRegister, allowedRegions, loading };
}

