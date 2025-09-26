import { useQuery } from '@tanstack/react-query';
import { fetchDocumentShareActivity, type DocumentShareActivity } from '@/services/documents';

export function useDocumentShareActivity(shareId: string | null, enabled: boolean) {
  return useQuery<{ items: DocumentShareActivity[] }, Error>({
    queryKey: ['documentShareActivity', shareId],
    enabled: enabled && Boolean(shareId),
    queryFn: async () => {
      if (!shareId) return { items: [] };
      const items = await fetchDocumentShareActivity(shareId);
      return { items };
    },
  });
}

export default useDocumentShareActivity;
