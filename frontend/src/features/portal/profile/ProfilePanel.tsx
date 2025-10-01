import { useEffect } from 'react';
import { useProfile } from './useProfile';
import { useForm } from 'react-hook-form';
import type { Profile } from '@/types';
import { Button } from '@/components/ui';

export function ProfilePanel() {
  const {
    data: profile,
    isLoading,
    mutate: update,
    isPending: isUpdating,
  } = useProfile();
  const { register, handleSubmit, reset } = useForm<Profile>();

  useEffect(() => {
    if (profile) {
      reset(profile);
    }
  }, [profile, reset]);

  const onSubmit = (data: Profile) => {
    update(data);
  };

  if (isLoading) {
    return <div>Loading profile...</div>;
  }

  return (
    <form onSubmit={(e) => void handleSubmit(onSubmit)(e)}>
      {/* Form fields for profile */}
      <input {...register('name')} />
      <input {...register('phone')} />
      <Button type="submit" disabled={isUpdating}>
        {isUpdating ? 'Saving...' : 'Save'}
      </Button>
    </form>
  );
}
