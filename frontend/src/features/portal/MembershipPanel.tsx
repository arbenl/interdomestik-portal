import { useAuth } from '@/hooks/useAuth';
import { useMembershipHistory } from '@/hooks/useMembershipHistory';
import DigitalMembershipCard from '@/components/DigitalMembershipCard';
import { useCardToken } from '@/hooks/useCardToken';
import useOfflineCard from '@/hooks/useOfflineCard';
import { useMemberProfile } from '@/hooks/useMemberProfile';
import type { Membership } from '@/types';

export function MembershipPanel() {
  const { user } = useAuth();
  const { data: history, isLoading, error } = useMembershipHistory(user?.uid);
  const { data: profile } = useMemberProfile(user?.uid);
  const { data: token, refetch } = useCardToken(user?.uid ?? null);
  const { enabled: offlineEnabled, setEnabled: setOfflineEnabled, token: effectiveToken, nearExpiry } = useOfflineCard(token || null);

  const name = profile?.name || user?.displayName || 'Member';
  const region = profile?.region || '—';
  const memberNo = profile?.memberNo || '—';
  const expiresAtSec = profile?.expiresAt?.seconds;
  const expiry = typeof expiresAtSec === 'number'
    ? new Date(expiresAtSec * 1000).toISOString().slice(0, 10)
    : '—';
  const nowSec = Math.floor(Date.now() / 1000);
  const computedStatus = typeof expiresAtSec === 'number' ? (expiresAtSec > nowSec ? 'active' : 'expired') : 'none';
  const status: 'active' | 'expired' | 'none' = profile?.status ?? computedStatus;

  const verifyUrl = effectiveToken
    ? `${location.origin}/verify?token=${encodeURIComponent(effectiveToken)}`
    : (memberNo && memberNo !== '—' ? `${location.origin}/verify?memberNo=${encodeURIComponent(memberNo)}` : undefined);

  if (isLoading) {
    return <div>Loading membership history...</div>;
  }

  if (error) {
    return <div>Error loading membership history: {error.message}</div>;
  }

  return (
    <div>
      <DigitalMembershipCard name={name} memberNo={memberNo} region={region} validUntil={expiry} status={status} verifyUrl={verifyUrl} role={profile?.role} />
      <div className="mt-3 p-3 border rounded bg-white flex items-center justify-between">
        <label className="inline-flex items-center gap-2 text-sm">
          <input type="checkbox" checked={offlineEnabled} onChange={(e)=> setOfflineEnabled(e.target.checked)} />
          Make my card available offline (no personal info stored)
        </label>
          {nearExpiry && (
          <button className="text-sm text-indigo-600 underline" onClick={() => { void refetch?.(); }}>Refresh token</button>
        )}
      </div>
      <h3>Membership History</h3>
      <ul>
        {history?.map((item: Membership, index: number) => {
          const expiresAtSec = item.expiresAt?.seconds ?? null;
          const label = expiresAtSec ? new Date(expiresAtSec * 1000).toLocaleDateString() : 'N/A';
          const key = item.id
            || `membership-${item.year ?? 'unknown'}-${expiresAtSec ?? 'no-expiry'}-${index}`;
          return (
            <li key={key}>{item.status} - {label}</li>
          );
        })}
      </ul>
    </div>
  );
}
