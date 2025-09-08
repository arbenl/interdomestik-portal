import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { auth, functions } from '../firebase';
import { signOut } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { useMemberProfile } from '../hooks/useMemberProfile';
import DigitalMembershipCard from '../components/DigitalMembershipCard';
import Button from '../components/ui/Button';
import { useToast } from '../components/ui/useToast';
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
  const [debugInfo, setDebugInfo] = useState<string | null>(null);
  const isLocal = typeof location !== 'undefined' && (location.hostname === 'localhost' || location.hostname === '127.0.0.1');
  const { push } = useToast();

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
      // Refresh Auth user to pick up displayName updates from server
      if (auth.currentUser) {
        try { await auth.currentUser.reload(); } catch (e) {
          console.warn('Failed to reload auth user', e);
        }
      }
      setSuccess('Profile updated successfully!');
      push({ type: 'success', message: 'Profile updated' });
      setDebugInfo(null);
    } catch (err) {
      const anyErr = err as Record<string, unknown>;
      const code = (anyErr?.code as string) || (anyErr?.name as string) || 'unknown';
      const message = (anyErr?.message as string) || 'Update failed';
      const details = anyErr?.details;
      setError(`${message}${code ? ` (code: ${code})` : ''}`);
      push({ type: 'error', message });
      try {
        setDebugInfo(JSON.stringify({ code, message, details }, null, 2));
      } catch {
        setDebugInfo(String(message));
      }
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      {isLocal && debugInfo && (
        <div className="mb-4 border border-red-300 bg-red-50 text-red-800 rounded p-3">
          <div className="font-semibold mb-1">Debug: upsertProfile error</div>
          <pre className="whitespace-pre-wrap text-xs">{debugInfo}</pre>
        </div>
      )}
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
              <Button type="submit">Update Profile</Button>
              <Button variant="ghost" onClick={handleSignOut}>Sign Out</Button>
            </div>
          </form>
        </div>
        <div className="md:col-span-1">
          <h2 className="text-2xl font-bold mb-4">Membership Card</h2>
          {(() => {
            if (!profile) return (
              <div className="bg-gray-100 rounded-2xl p-6 text-center text-gray-500">
                <p>No active membership found.</p>
              </div>
            );
            const expiresAtSec = activeMembership?.expiresAt?.seconds ?? (profile as any)?.expiresAt?.seconds;
            const hasActive = typeof expiresAtSec === 'number' && expiresAtSec * 1000 > Date.now();
            const validUntil = typeof expiresAtSec === 'number' ? new Date(expiresAtSec * 1000).toLocaleDateString() : '—';
            const status = hasActive ? 'active' : (typeof expiresAtSec === 'number' ? 'expired' : 'none');
            const memberNo = profile.memberNo || '—';
            const verifyUrl = memberNo && memberNo !== '—' ? `${location.origin}/verify?memberNo=${encodeURIComponent(memberNo)}` : undefined;
            if (hasActive) {
              return (
                <DigitalMembershipCard
                  name={profile.name || 'Member'}
                  memberNo={memberNo}
                  region={profile.region || '—'}
                  validUntil={validUntil}
                  status={status}
                  verifyUrl={verifyUrl}
                />
              );
            }
            return (
              <div className="bg-gray-100 rounded-2xl p-6 text-center text-gray-500">
                <p>No active membership found.</p>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
