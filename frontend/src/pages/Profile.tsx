import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { auth, functions } from '../firebase';
import { signOut } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { useMemberProfile } from '../hooks/useMemberProfile';
import DigitalMembershipCard from '../components/DigitalMembershipCard';
import RegionSelect from '../components/RegionSelect';
import { ProfileInput } from '../validation/profile';

const upsertProfile = httpsCallable(functions, 'upsertProfile');

export default function Profile() {
  const { user } = useAuth();
  const { profile, activeMembership, loading, error: profileError } = useMemberProfile(user?.uid);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [region, setRegion] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setPhone(profile.phone || '');
      setRegion(profile.region || '');
    }
  }, [profile]);

  const handleSignOut = async () => {
    await signOut(auth);
  };

  function validate(): string | null {
    const parsed = ProfileInput.safeParse({ name, region, phone });
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return first?.message || 'Invalid input';
    }
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const v = validate();
    if (v) { setError(v); return; }
    try {
      await upsertProfile({ name: name.trim(), phone: phone.trim(), region });
      setSuccess('Profile updated successfully!');
    } catch (err: any) {
      setError(err?.message || 'Update failed');
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          <h2 className="text-2xl font-bold mb-4">My Profile</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="mt-1 block w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Region</label>
              <RegionSelect
                value={region}
                onChange={setRegion}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            {profileError && <p className="text-sm text-red-600">Error loading profile: {profileError.message}</p>}
            {success && <p className="text-sm text-green-600">{success}</p>}
            <div className="flex justify-between items-center">
              <button
                type="submit"
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Update Profile
              </button>
              <button
                onClick={handleSignOut}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Sign Out
              </button>
            </div>
          </form>
        </div>
        <div className="md:col-span-1">
          <h2 className="text-2xl font-bold mb-4">Membership Card</h2>
          {profile && activeMembership ? (
            <DigitalMembershipCard 
              name={profile.name}
              memberNo={profile.memberNo}
              region={profile.region}
              validUntil={new Date((activeMembership.expiresAt.seconds || activeMembership.expiresAt._seconds) * 1000).toLocaleDateString()}
            />
          ) : (
            <div className="bg-gray-100 rounded-2xl p-6 text-center text-gray-500">
              <p>No active membership found.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
