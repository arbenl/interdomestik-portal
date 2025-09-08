import { useEffect, useState } from 'react';
import { useAuth } from './useAuth';

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
      // Force refresh to pick up updated custom claims (emulator/dev convenience)
      await user.getIdToken(true);
      const token = await user.getIdTokenResult();
      if (!mounted) return;
      const claims = token.claims as { role?: string; allowedRegions?: string[] };
      setRole(claims.role ?? null);
      setAllowedRegions(Array.isArray(claims.allowedRegions) ? claims.allowedRegions : []);
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
