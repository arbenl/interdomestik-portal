import Button from '../ui/Button';
import SimpleQr from '../SimpleQr';

type Props = {
  name: string;
  status: 'active' | 'expired' | 'none' | string;
  memberNo?: string;
  expiresOn?: string;
  verifyUrl?: string;
};

export default function PortalHero({ name, status, memberNo, expiresOn, verifyUrl }: Props) {
  const chip = (() => {
    const s = (status || 'none').toString().toLowerCase();
    if (s === 'active') return { label: 'ACTIVE', cls: 'bg-green-100 text-green-800' };
    if (s === 'expired') return { label: 'EXPIRED', cls: 'bg-yellow-100 text-yellow-800' };
    return { label: 'INACTIVE', cls: 'bg-gray-100 text-gray-800' };
  })();
  let justRenewed = false;
  try {
    const t = Number(localStorage.getItem('renewed_at') || '0');
    if (t > 0 && Date.now() - t < 30 * 60 * 1000) {
      justRenewed = true;
    }
  } catch {}

  return (
    <section className="bg-white rounded-xl shadow-sm border p-5 md:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Welcome, {name}</h1>
          <div className="mt-2 flex items-center gap-3 text-sm text-gray-600">
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${chip.cls}`}>{chip.label}</span>
            {memberNo && <span className="font-mono">Member No: {memberNo}</span>}
            {expiresOn && <span>Valid until: {expiresOn}</span>}
            {justRenewed && <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">RENEWED</span>}
          </div>
        </div>
        {verifyUrl && (
          <div className="hidden sm:flex items-center gap-3">
            <SimpleQr value={verifyUrl} size={84} className="rounded bg-white p-1 border" />
            <div className="text-xs text-gray-500 max-w-[220px]">
              <div className="font-medium text-gray-700 mb-1">Verify</div>
              <a className="underline break-all" href={verifyUrl}>{verifyUrl}</a>
            </div>
          </div>
        )}
      </div>

      <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
        <Button className="w-full" onClick={() => (location.href = '/profile')}>Update profile</Button>
        <Button variant="ghost" className="w-full" onClick={() => (location.href = '/membership')}>View history</Button>
        <Button variant="ghost" className="w-full" onClick={() => (location.href = '/verify')}>Verify membership</Button>
      </div>
    </section>
  );
}
