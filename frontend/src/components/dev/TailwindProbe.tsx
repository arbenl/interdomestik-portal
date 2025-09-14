// src/components/dev/TailwindProbe.tsx
'use client';

import { useEffect } from 'react';

export default function TailwindProbe() {
  useEffect(() => {
    if (import.meta.env.DEV) {
      const probe = document.createElement('div');
      probe.className = 'absolute -left-[9999px] text-[rgb(255,0,0)]';
      document.body.appendChild(probe);

      const computedColor = window.getComputedStyle(probe).color;
      
      if (computedColor === 'rgb(255, 0, 0)') {
        console.debug(
          '%c[TailwindProbe] Tailwind CSS is active.',
          'background: #22c55e; color: #ffffff; font-weight: bold; padding: 4px; border-radius: 4px;'
        );
      } else {
        console.warn(
          '%c[TailwindProbe] Tailwind CSS NOT applied!',
          'background: #ef4444; color: #ffffff; font-weight: bold; padding: 4px; border-radius: 4px;',
          'If styles are missing, try running "pnpm -F frontend run clean:dev" and restarting the dev server.'
        );
      }
      
      document.body.removeChild(probe);
    }
  }, []);

  return null;
}