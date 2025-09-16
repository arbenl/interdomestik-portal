import { useQuery } from '@tanstack/react-query';
import { doc, getDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';

export function useMetrics(dateKey: string) {
  return useQuery({
    queryKey: ['metrics', dateKey],
    queryFn: async () => {
      const ref = doc(firestore, 'metrics', `daily-${dateKey}`);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const raw = snap.data() as { activations_total: number; activations_by_region: Record<string, number> };
        const total = typeof raw['activations_total'] === 'number' ? raw['activations_total'] : 0;
        let byRegion: Record<string, number> = {};
        const src = raw['activations_by_region'];
        if (src && typeof src === 'object') {
          byRegion = Object.fromEntries(
            Object.entries(src as Record<string, unknown>).filter(([, v]) => typeof v === 'number') as Array<[string, number]>
          );
        }
        return { activations_total: total, activations_by_region: byRegion };
      } else {
        return { activations_total: 0, activations_by_region: {} };
      }
    },
  });
}
