import { useAuth } from '@/hooks/useAuth';

export default function useAgentOrAdmin() {
  const { isAdmin, isAgent, loading, allowedRegions } = useAuth();

  return {
    isAdmin,
    isAgent,
    canRegister: isAdmin || isAgent,
    allowedRegions,
    loading,
  };
}
