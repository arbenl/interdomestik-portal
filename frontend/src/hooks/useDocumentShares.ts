import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { fetchDocumentSharesForUser, type DocumentShare } from '@/services/documents';

export function useDocumentShares() {
  const { user } = useAuth();

  const query = useQuery<{ shares: DocumentShare[] }, Error>({
    queryKey: ['documentShares', user?.uid ?? 'guest'],
    enabled: Boolean(user?.uid),
    queryFn: async () => {
      if (!user?.uid) {
        return { shares: [] };
      }
      const shares = await fetchDocumentSharesForUser(user.uid);
      return { shares };
    },
  });

  return {
    shares: query.data?.shares ?? [],
    ...query,
  };
}

export default useDocumentShares;
