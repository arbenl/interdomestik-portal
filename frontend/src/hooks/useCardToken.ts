import { useQuery } from '@tanstack/react-query';
import { getCardToken } from '../services/member';

export const useCardToken = (uid: string | null) => {
  return useQuery({
    queryKey: ['cardToken', uid],
    queryFn: () => getCardToken(uid!),
    enabled: !!uid,
  });
};
