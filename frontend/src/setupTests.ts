import '@testing-library/jest-dom';
import { vi } from 'vitest';

vi.mock('@/services/functionsClient');

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,

    onchange: null,
    addListener: () => {}, removeListener: () => {},
    addEventListener: () => {}, removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

export { __setCallable } from '@/services/__mocks__/functionsClient';
