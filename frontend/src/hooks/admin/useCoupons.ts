import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Coupon } from '@/types';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';

const listCoupons = httpsCallable<void, { items: Coupon[] }>(functions, 'listCoupons');
const createCoupon = httpsCallable<{ code: string; percentOff?: number; amountOff?: number; active?: boolean }, { ok: boolean }>(functions, 'createCoupon');

export function useCoupons() {
  const queryClient = useQueryClient();
  const { isAdmin } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ['coupons'],
    queryFn: async () => {
      const r = await listCoupons();
      return (r.data.items || []).map((c: Coupon) => ({ id: String(c.id), percentOff: Number(c.percentOff || 0), amountOff: Number(c.amountOff || 0), active: c.active !== false }));
    },
    enabled: isAdmin,
  });

  const { mutateAsync: create } = useMutation({
    mutationFn: async ({ code, percentOff, amountOff, active }: { code: string; percentOff: number; amountOff: number; active: boolean }) => {
      await createCoupon({ code, percentOff, amountOff, active });
    },
    onSuccess: () => {
      return queryClient.invalidateQueries({ queryKey: ['coupons'] });
    },
  });

  return { data, isLoading, error, create };
}
