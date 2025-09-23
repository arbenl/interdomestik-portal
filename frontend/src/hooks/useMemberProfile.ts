import { useQuery } from '@tanstack/react-query';
import { getMemberProfile } from '../services/member';

export const useMemberProfile = (uid: string | undefined) => {
  return useQuery({ 
    queryKey: ['memberProfile', uid], 
    queryFn: () => getMemberProfile(uid!),
    enabled: !!uid,
  });
};
