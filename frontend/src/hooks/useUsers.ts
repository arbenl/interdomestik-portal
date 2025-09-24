import { useInfiniteQuery } from '@tanstack/react-query';
import { getUsers } from '../services/admin';

/**
 * A hook for fetching a paginated list of users with optional filters.
 *
 * @param filters An object containing filter criteria (region, status, etc.).
 * @returns An object with the canonical TanStack Query properties for infinite queries.
 */
export const useUsers = ({ allowedRegions = [], region, status, expiringDays, limit, enabled = true }: { allowedRegions?: string[], region: string, status: string, expiringDays: number | null, limit: number, enabled?: boolean }) => {
  return useInfiniteQuery({
    queryKey: ['users', { region, status, expiringDays }],
    queryFn: ({ pageParam }: { pageParam: unknown }) => getUsers({ allowedRegions, region, status, expiringDays, pageParam, limitNum: limit }),
    getNextPageParam: (lastPage): unknown => lastPage?.nextPage,
    initialPageParam: null,
    enabled,
  });
};
