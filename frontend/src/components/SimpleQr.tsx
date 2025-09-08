import { useMemo, useState, forwardRef } from 'react';

type Props = { value: string; size?: number; className?: string };

const SimpleQr = forwardRef<HTMLImageElement, Props>(function SimpleQr({ value, size = 128, className }, ref) {
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
      ref={ref}
      src={src}
      width={size}
      height={size}
      alt="QR code"
      className={className}
      crossOrigin="anonymous"
      referrerPolicy="no-referrer"
      onError={() => {
        if (src !== fallback) setSrc(fallback);
      }}
    />
  );
});

export default SimpleQr;
