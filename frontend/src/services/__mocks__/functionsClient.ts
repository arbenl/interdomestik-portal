import { vi } from 'vitest';

type Callable = (...args: unknown[]) => unknown;

const callables: Record<string, Callable> = {};

export function __setCallable(name: string, fn: Callable) {
  callables[name] = fn;
}

export const callFn = vi.fn((name: string, data?: unknown) => {
  if (callables[name]) {
    return callables[name](data);
  }
  return Promise.resolve({ data: null });
});