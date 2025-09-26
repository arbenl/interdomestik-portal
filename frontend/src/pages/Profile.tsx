'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { useMemberProfile } from '@/hooks/useMemberProfile';
import DigitalMembershipCard from '@/components/DigitalMembershipCard';
import { Button } from '@/components/ui';
import { useToast } from '@/components/ui/useToast';
import RegionSelect from '@/components/RegionSelect';
import { ProfileInput } from '@/validation/profile';
import type { Profile } from '@/types';
import { useHttpsCallable } from '../hooks/useHttpsCallable';
import PortalShell from '@/components/layout/PortalShell';

export default function Profile() {
  const { user } = useAuth();
  const { data: profile, isLoading, error: profileError } = useMemberProfile(user?.uid);
  const { callFunction: upsertProfile, error: upsertError, loading: upsertLoading } = useHttpsCallable('upsertProfile');

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

  useEffect(() => {
    if (upsertError) {
      const code = upsertError.code || 'unknown';
      const message = upsertError.message || 'Update failed';
      setError(`${message}${code ? ` (code: ${code})` : ''}`);
      push({ type: 'error', message });
      try {
        setDebugInfo(JSON.stringify({ code, message, details: upsertError.details }, null, 2));
      } catch {
        setDebugInfo(String(message));
      }
    }
  }, [upsertError, push]);

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
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <PortalShell>
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
          <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="mt-1 block w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                autoComplete="email"
              />
            </div>
            <div>
              <label htmlFor="name-input" className="block text-sm font-medium text-gray-700">Name</label>
              <input
                id="name-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                autoComplete="name"
              />
            </div>
            <div>
              <label htmlFor="phone-input" className="block text-sm font-medium text-gray-700">Phone</label>
              <input
                id="phone-input"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                autoComplete="tel"
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
              <Button type="submit" disabled={upsertLoading}>Update Profile</Button>
              <Button variant="ghost" onClick={() => { void handleSignOut(); }}>Sign Out</Button>
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
            type TS = { seconds?: number } | undefined;
            const profileExpires = (profile as unknown as { expiresAt?: TS })?.expiresAt?.seconds;
            const expiresAtSec = profile?.expiresAt?.seconds ?? profileExpires;
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
    </PortalShell>
  );
}
