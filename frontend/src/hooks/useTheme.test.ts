import { renderHook, act } from '@testing-library/react';
import { vi } from 'vitest';
import { useTheme } from './useTheme';

beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
  window.localStorage.clear();
});

describe('useTheme Hook', () => {
  it('should toggle theme from light to dark', () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('light');

    act(() => {
      result.current.setTheme('dark');
    });

    expect(result.current.theme).toBe('dark');
  });

  it('should persist theme to localStorage', () => {
    const { result } = renderHook(() => useTheme());
    const newTheme = 'dark';

    act(() => {
      result.current.setTheme(newTheme);
    });

    expect(localStorage.getItem('theme')).toBe(newTheme);
  });
});
