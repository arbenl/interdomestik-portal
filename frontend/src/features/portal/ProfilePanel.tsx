import { useAuth } from '../../context/auth';
import { useMemberProfile } from '../../hooks/useMemberProfile';

export function ProfilePanel() {
  const { user } = useAuth();
  const { data: profile, isLoading, error } = useMemberProfile(user?.uid);

  if (isLoading) {
    return <div>Loading profile...</div>;
  }

  if (error) {
    return <div>Error loading profile: {error.message}</div>;
  }

  return (
    <div>
      <h2>{profile?.name}</h2>
      <p>{profile?.email}</p>
      <p>{profile?.region}</p>
    </div>
  );
}
