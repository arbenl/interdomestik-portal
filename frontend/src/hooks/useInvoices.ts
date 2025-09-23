import { useQuery } from '@tanstack/react-query';
import { getInvoices } from '../services/member';

export const useInvoices = (uid: string | undefined) => {
  return useQuery({ 
    queryKey: ['invoices', uid], 
    queryFn: () => getInvoices(uid!),
    enabled: !!uid,
  });
};
