import { useMemo, forwardRef } from 'react';

type Props = { value: string; size?: number; className?: string };

const SimpleQr = forwardRef<HTMLImageElement, Props>(function SimpleQr(
  { value, size = 128, className },
  ref
) {
  const src = useMemo(
    () =>
      `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}`,
    [value, size]
  );
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
    />
  );
});

export default SimpleQr;
