import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

const getInitialTheme = (): Theme => {
  if (typeof window !== 'undefined') {
    const storedTheme = window.localStorage.getItem('theme') as Theme;
    if (storedTheme && ['light', 'dark'].includes(storedTheme)) {
      return storedTheme;
    }
    const supportsMatchMedia = typeof window.matchMedia === 'function';
    const userMedia = supportsMatchMedia
      ? window.matchMedia('(prefers-color-scheme: dark)')
      : null;
    if (userMedia?.matches) {
      return 'dark';
    }
  }
  return 'light';
};

export const useTheme = () => {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  return { theme, setTheme };
};
