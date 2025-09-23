
import { useState, useCallback } from 'react';
import type { Profile } from '@/types';
import { useUsers } from '@/hooks/useUsers';
import { MembersList } from './MembersList';
import ActivateMembershipModal from '@/components/ActivateMembershipModal';
import { useToast } from '@/components/ui/useToast';
import { useUrlState } from '@/utils/urlState';
import { safeErrorMessage } from '@/utils/errors';

export function MembersPanel({ allowedRegions }: { allowedRegions: string[] }) {
  const [filters, setFilters] = useUrlState({
    region: 'ALL',
    status: 'ALL',
    expiringSoon: false,
  });

const { data, error, fetchNextPage, hasNextPage, isLoading } = useUsers({ allowedRegions, limit: 25, region: filters.region, status: filters.status, expiringDays: filters.expiringSoon ? 30 : null });
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { push } = useToast();

  const handleActivateClick = useCallback((user: Profile) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedUser(null);
  }, []);

  const handleSuccess = useCallback((message: string) => {
    push({ type: 'success', message });
  }, [push]);

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen"><p>Loading...</p></div>;
  }

  if (error) {
    return <div>Error: {safeErrorMessage(error)}</div>;
  }

  const users = data?.pages.flatMap(page => page.users) || [];

  return (
    <>
      <MembersList
        users={users}
        error={error}
        onActivateClick={handleActivateClick}
        onSuccess={handleSuccess}
        refresh={() => {}}
        nextPage={() => { void fetchNextPage(); }}
        hasNext={hasNextPage}
        setRegionFilter={(region) => setFilters({ region })}
        setStatusFilter={(status) => setFilters({ status })}
        setExpiringSoon={(expiringSoon) => setFilters({ expiringSoon })}
      />
      {isModalOpen && selectedUser && (
        <ActivateMembershipModal
          user={{ id: selectedUser.id!, email: selectedUser.email }}
          onClose={handleCloseModal}
          onSuccess={handleSuccess}
        />
      )}
    </>
  );
}
