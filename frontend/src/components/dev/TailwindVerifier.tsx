'use client';

import { useEffect } from 'react';

export function TailwindVerifier() {
  useEffect(() => {
    if (import.meta.env.DEV) {
      const el = document.createElement('div');
      el.className = 'hidden text-[color:rgb(255,1,2)]'; // Use a very specific color
      document.body.appendChild(el);

      const computedColor = window.getComputedStyle(el).color;

      if (computedColor !== 'rgb(255, 1, 2)') {
        console.warn(
          '%c Tailwind CSS not applied! ',
          'background: #ef4444; color: #ffffff; font-weight: bold; padding: 4px;',
          'Check tailwind.config.ts, postcss.config.cjs, and src/index.css.'
        );
      } else {
        console.log(
          '%c Tailwind CSS applied successfully. ',
          'background: #22c55e; color: #ffffff; font-weight: bold; padding: 4px;'
        );
      }

      document.body.removeChild(el);
    }
  }, []);

  return null;
}
