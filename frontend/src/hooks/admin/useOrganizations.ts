import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Organization } from '@/types';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';

const listOrganizations = httpsCallable<void, { items: Organization[] }>(functions, 'listOrganizations');
const createOrganization = httpsCallable<{ name: string; billingEmail?: string; seats?: number }, { ok: boolean; id: string }>(functions, 'createOrganization');

export function useOrganizations() {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['organizations'],
    queryFn: async () => {
      const r = await listOrganizations();
      return (r.data.items || []).map((o: Organization) => ({
        id: String(o.id),
        name: String(o.name || ''),
        seats: Number(o.seats || 0),
        activeSeats: Number(o.activeSeats || 0),
        billingEmail: o.billingEmail ? String(o.billingEmail) : undefined,
      }));
    },
  });

  const { mutateAsync: create } = useMutation({
    mutationFn: async ({ name, email, seats }: { name: string; email: string; seats: number }) => {
      await createOrganization({ name, billingEmail: email, seats });
    },
    onSuccess: () => {
      return queryClient.invalidateQueries({ queryKey: ['organizations'] });
    },
  });

  return { data, isLoading, error, create };
}