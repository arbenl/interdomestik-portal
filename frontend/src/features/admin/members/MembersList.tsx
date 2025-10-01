import type { Profile } from '@/types';

export function MembersList({
  users,
}: {
  users: Profile[];
  error: Error | null;
  onActivateClick: (user: Profile) => void;
  onSuccess: (message: string) => void;
  refresh: () => void;
  nextPage: () => void;
  hasNext: boolean;
  setRegionFilter: (region: string) => void;
  setStatusFilter: (status: 'ALL' | 'ACTIVE' | 'INACTIVE' | 'EXPIRED') => void;
  setExpiringSoon: (expiring: boolean) => void;
}) {
  return <div>{users.length} users</div>;
}
