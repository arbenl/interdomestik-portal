import { useEffect, useState } from 'react';

export default function DiagCss() {
  const [missing, setMissing] = useState(false);
  useEffect(() => {
    const el = document.createElement('div');
    el.className = 'flex';
    el.style.position = 'absolute';
    el.style.left = '-9999px';
    el.style.top = '-9999px';
    document.body.appendChild(el);
    const display = getComputedStyle(el).display;
    if (display !== 'flex') setMissing(true);
    document.body.removeChild(el);
  }, []);
  if (!missing) return null;
  return (
    <div className="bg-red-600 text-white text-sm px-3 py-2">
      Tailwind CSS not applied. Try: 1) cd frontend && rm -rf node_modules .vite && npm i && npm run dev, 2) hard refresh, or 3) build + serve via Hosting. If persists, check Network for CSS/POSTCSS errors.
    </div>
  );
}
