# Data Access & Queries

All data fetching and server state management in the frontend is handled by TanStack Query.

## TanStack Query Patterns

- **Query Naming**: Query keys should be structured as an array, starting with a string identifier for the data type, followed by any parameters.

  ```typescript
  // Example for a single user's profile
  queryKey: ['profile', userId];

  // Example for a list of users with filters
  queryKey: ['users', { region, status }];
  ```

- **Hooks**:
  - `useQuery`: For fetching data that is read-only or doesn't change frequently.
  - `useInfiniteQuery`: For paginated lists.
  - `useMutation`: For creating, updating, or deleting data.

## Canonical Hook Shapes

To ensure consistency, custom hooks that wrap TanStack Query should return objects with the following canonical property names:

- **Queries**: `{ data, isLoading, error }`
- **Mutations**: `{ mutate, isPending, error }`

**Example `useProfile` Hook:**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getProfile, updateProfile } from '@/services/member/profile.service';
import { useAuth } from '@/context/auth';
import type { Profile } from '@/types';

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
```

## Prefetching

To improve perceived performance, data for key routes is prefetched on hover/focus. This is implemented in the `Navbar` component by calling `queryClient.prefetchQuery`.
