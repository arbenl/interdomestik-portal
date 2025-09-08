import { useMemo, useState } from 'react';

type Props = { value: string; size?: number; className?: string };

export default function SimpleQr({ value, size = 128, className }: Props) {
  const primary = useMemo(
    () => `https://chart.googleapis.com/chart?cht=qr&chs=${size}x${size}&chl=${encodeURIComponent(value)}`,
    [value, size]
  );
  const fallback = useMemo(
    () => `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}`,
    [value, size]
  );
  const [src, setSrc] = useState(primary);
  return (
    <img
      src={src}
      width={size}
      height={size}
      alt="QR code"
      className={className}
      referrerPolicy="no-referrer"
      onError={() => {
        if (src !== fallback) setSrc(fallback);
      }}
    />
  );
}
