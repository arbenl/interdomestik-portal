import { useQuery } from '@tanstack/react-query';
import { getMembershipHistory } from '../services/member';

export const useMembershipHistory = (uid: string | undefined) => {
  return useQuery({ 
    queryKey: ['membershipHistory', uid], 
    queryFn: () => getMembershipHistory(uid!),
    enabled: !!uid,
  });
};
