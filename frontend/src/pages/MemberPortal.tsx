import { Link } from 'react-router-dom';
import DigitalMembershipCard from '../components/DigitalMembershipCard';
import { useAuth } from '../hooks/useAuth';
import { useMemberProfile } from '../hooks/useMemberProfile';
import { useMembershipHistory } from '../hooks/useMembershipHistory';
import PortalHero from '../components/portal/PortalHero';
import { BentoGrid, BentoCard } from '../components/portal/BentoGrid';
import ActivityFeed from '../components/portal/ActivityFeed';
import { IconCalendar, IconCreditCard, IconUsers } from '../components/icons';
import { useEvents } from '../hooks/useEvents';
import { useDirectory } from '../hooks/useDirectory';
import useCardToken from '../hooks/useCardToken';
import useOfflineCard from '../hooks/useOfflineCard';

export default function MemberPortal() {
  const { user } = useAuth();
  const { profile, activeMembership, loading, error } = useMemberProfile(user?.uid);
  const { history } = useMembershipHistory(user?.uid);
  const historyCount = history.length;
  // Hooks must be declared unconditionally (before any early return)
  const { events } = useEvents(5);
  const { members: directory } = useDirectory(5);
  const { token, refresh } = useCardToken(user?.uid || null);
  const { enabled: offlineEnabled, setEnabled: setOfflineEnabled, token: effectiveToken, nearExpiry } = useOfflineCard(token);

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-2">Welcome</h1>
        <p className="mb-4">Please sign in to view your member portal.</p>
        <Link className="text-indigo-600 underline" to="/signin">Go to Sign In</Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto p-6 animate-pulse">
        <div className="h-8 w-64 bg-gray-200 rounded mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 h-64 bg-gray-200 rounded" />
          <div className="md:col-span-2 space-y-3">
            <div className="h-10 bg-gray-200 rounded" />
            <div className="h-10 bg-gray-200 rounded" />
            <div className="h-10 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    );
  }

  const name = profile?.name || user.displayName || 'Member';
  const region = profile?.region || '—';
  const memberNo = profile?.memberNo || '—';
  const expiresAtSec = activeMembership?.expiresAt?.seconds ?? profile?.expiresAt?.seconds;
  const expiry = typeof expiresAtSec === 'number'
    ? new Date(expiresAtSec * 1000).toISOString().slice(0, 10)
    : '—';
  const nowSec = Math.floor(Date.now() / 1000);
  const computedStatus = typeof expiresAtSec === 'number' ? (expiresAtSec > nowSec ? 'active' : 'expired') : 'none';
  const status = (profile?.status as string | undefined) || computedStatus;

  const verifyUrl = effectiveToken
    ? `${location.origin}/verify?token=${encodeURIComponent(effectiveToken)}`
    : (memberNo && memberNo !== '—' ? `${location.origin}/verify?memberNo=${encodeURIComponent(memberNo)}` : undefined);

  return (
    <div className="max-w-6xl mx-auto">
      <PortalHero name={name} status={status} memberNo={memberNo !== '—' ? memberNo : undefined} expiresOn={expiry !== '—' ? expiry : undefined} verifyUrl={verifyUrl} />

      <div className="mt-3 p-3 border rounded bg-white flex items-center justify-between">
        <label className="inline-flex items-center gap-2 text-sm">
          <input type="checkbox" checked={offlineEnabled} onChange={(e)=> setOfflineEnabled(e.target.checked)} />
          Make my card available offline (no personal info stored)
        </label>
        {nearExpiry && (
          <button className="text-sm text-indigo-600 underline" onClick={()=> refresh?.()}>Refresh token</button>
        )}
      </div>

      {status !== 'active' && (
        <div className="mt-4 border rounded p-4 bg-yellow-50">
          <div className="font-medium mb-1">Your membership is {status === 'expired' ? 'expired' : 'not active'}.</div>
          <div className="text-sm text-gray-700">Renew now to re-activate your digital membership card.</div>
          <div className="mt-2"><Link to="/billing" className="inline-block bg-indigo-600 text-white px-3 py-2 rounded">Renew Membership</Link></div>
        </div>
      )}

      {error && (
        <div className="mt-4 border border-red-300 bg-red-50 text-red-800 rounded p-3">
          Failed to load profile: {error.message}
        </div>
      )}

      <div className="mt-6">
        <BentoGrid>
          <BentoCard title="Your digital card" subtitle="Show at events or checkpoints" span={1}>
            <DigitalMembershipCard name={name} memberNo={memberNo} region={region} validUntil={expiry} status={status} verifyUrl={verifyUrl} />
          </BentoCard>

          <BentoCard title="Recent activity" subtitle="Announcements and events" span={2}>
            <ActivityFeed />
          </BentoCard>

          <BentoCard title="Benefits" subtitle={`Your member perks • ${historyCount} record${historyCount===1?'':'s'}`}>
            <ul className="text-sm text-gray-700 list-disc pl-5 space-y-1">
              <li>Discounts with partner organizations</li>
              <li>Early access to events and trainings</li>
              <li>Support line and resources</li>
            </ul>
            <div className="text-xs text-gray-500 mt-2">More coming soon.</div>
          </BentoCard>

          <BentoCard title="Community" subtitle="Connect with members" span={1}>
            <div className="flex items-center gap-2 mb-3 text-gray-700"><IconUsers width={18} height={18} /> Recently active</div>
            {directory.length === 0 ? (
              <p className="text-sm text-gray-600">No members yet.</p>
            ) : (
              <ul className="text-sm text-gray-700 space-y-1">
                {directory.map((m) => (
                  <li key={m.id} className="flex items-center justify-between">
                    <span>{m.name || 'Member'}</span>
                    <span className="text-xs text-gray-500">{m.region || '—'}</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-3"><Link to="/profile" className="text-indigo-600 underline">Update profile visibility</Link></div>
          </BentoCard>

          <BentoCard title="Upcoming events" subtitle="What’s happening" span={1}>
            <div className="flex items-center gap-2 mb-3 text-gray-700"><IconCalendar width={18} height={18} /> Next up</div>
            {events.length === 0 ? (
              <p className="text-sm text-gray-600">No events yet.</p>
            ) : (
              <ul className="text-sm text-gray-700 space-y-1">
                {events.map((e) => (
                  <li key={e.id} className="flex items-center justify-between">
                    <span>{e.title}</span>
                    <span className="text-xs text-gray-500">{e.startAt ? new Date(e.startAt.seconds * 1000).toLocaleDateString() : ''}</span>
                  </li>
                ))}
              </ul>
            )}
          </BentoCard>

          <BentoCard title="Billing & Subscription" subtitle="Manage your membership" span={1}>
            <div className="flex items-center gap-2 mb-3 text-gray-700"><IconCreditCard width={18} height={18} /> Payments</div>
            <p className="text-sm text-gray-700">View invoices and manage renewal.</p>
            <div className="mt-3"><Link to="/billing" className="text-indigo-600 underline">Open billing</Link></div>
          </BentoCard>
        </BentoGrid>
      </div>
    </div>
  );
}
