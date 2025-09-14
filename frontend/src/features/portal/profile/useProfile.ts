import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getProfile, updateProfile } from '@/services/member/profile.service';
import { useAuth } from '@/context/auth';
import type { Profile } from '@/types';

/**
 * A hook for fetching and updating the current user's profile.
 *
 * @returns An object with the canonical TanStack Query properties:
 *  - `data`: The user's profile object.
 *  - `isLoading`: True if the initial profile fetch is in progress.
 *  - `error`: An error object if the fetch fails.
 *  - `mutate`: A function to call to update the user's profile.
 *  - `isPending`: True if the profile update mutation is in progress.
 */
export function useProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['profile', user?.uid],
    queryFn: () => getProfile(user!.uid),
    enabled: !!user,
  });

  const { mutate, isPending } = useMutation({
    mutationFn: (data: Partial<Profile>) => updateProfile(user!.uid, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['profile', user?.uid] });
    },
  });

  return { data, isLoading, error, mutate, isPending };
}
