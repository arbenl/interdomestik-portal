import React, { useRef } from 'react';

interface DigitalMembershipCardProps {
  name: string;
  memberNo: string;
  region: string;
  validUntil: string;
  status?: 'active' | 'expired' | 'none';
  verifyUrl?: string;
  role?: 'member' | 'agent' | 'admin';
}

import SimpleQr from './SimpleQr';
import { Button } from '@/components/ui';

const DigitalMembershipCard: React.FC<DigitalMembershipCardProps> = ({
  name,
  memberNo,
  region,
  validUntil,
  status = 'none',
  verifyUrl,
  role,
}) => {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const qrUrl = verifyUrl
    ? `https://chart.googleapis.com/chart?cht=qr&chs=200x200&chl=${encodeURIComponent(verifyUrl)}`
    : undefined;
  const copyLink = async () => {
    if (!verifyUrl) return;
    try {
      await navigator.clipboard.writeText(verifyUrl);
    } catch (e) {
      // Non-blocking: clipboard API may be unavailable or denied
      console.warn('Failed to copy verify URL', e);
    }
  };
  const downloadQr = () => {
    try {
      const img = imgRef.current;
      if (!img) throw new Error('QR not ready');
      // Draw to canvas to get a same-origin data URL (requires CORS-enabled image)
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || 200;
      canvas.height = img.naturalHeight || 200;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('2D context unavailable');
      ctx.drawImage(img, 0, 0);
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = 'membership-qr.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      // Fallback: open current QR URL so user can save manually
      const src = imgRef.current?.src || qrUrl;
      if (src) window.open(src, '_blank');
      else console.warn('QR download failed', e);
    }
  };
  const statusCfg = (() => {
    const s = (status || 'none').toString().toLowerCase();
    if (s === 'active')
      return { label: 'ACTIVE', cls: 'bg-green-500 text-green-900' };
    if (s === 'expired')
      return { label: 'EXPIRED', cls: 'bg-yellow-400 text-yellow-900' };
    return { label: 'INACTIVE', cls: 'bg-gray-300 text-gray-900' };
  })();
  return (
    <div className="bg-gradient-to-br from-gray-800 to-gray-900 text-white rounded-2xl p-6 shadow-lg max-w-sm mx-auto">
      <div className="flex justify-between items-start">
        <h2 className="text-xl font-bold">Interdomestik</h2>
        <span
          className={`text-xs font-mono px-2 py-1 rounded ${statusCfg.cls}`}
        >
          {statusCfg.label}
        </span>
      </div>
      <div className="mt-8">
        <p className="text-sm text-gray-400">Member No.</p>
        <p className="text-2xl font-mono tracking-widest">{memberNo}</p>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-gray-400">Name</p>
          <p className="font-medium">{name}</p>
        </div>
        <div>
          <p className="text-gray-400">Region</p>
          <p className="font-medium">{region}</p>
        </div>
        {role && (
          <div>
            <p className="text-gray-400">Role</p>
            <p className="font-medium uppercase">{String(role)}</p>
          </div>
        )}
        <div>
          <p className="text-gray-400">Valid Until</p>
          <p className="font-medium">{validUntil}</p>
        </div>
      </div>
      {verifyUrl && (
        <div className="mt-6 flex items-start gap-4">
          <SimpleQr
            ref={imgRef}
            value={verifyUrl}
            size={96}
            className="rounded bg-white p-1"
          />
          <div className="text-xs text-gray-300 flex-1">
            <div className="mb-1">Verify:</div>
            <a href={verifyUrl} className="underline text-gray-200 break-all">
              {verifyUrl}
            </a>
            <div className="mt-2 flex gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  void copyLink();
                }}
                className="px-2 py-1 text-white border border-white/20"
              >
                Copy link
              </Button>
              {verifyUrl && (
                <button
                  onClick={() => {
                    downloadQr();
                  }}
                  className="px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 text-white border border-white/20 text-sm"
                >
                  Download QR
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DigitalMembershipCard;
