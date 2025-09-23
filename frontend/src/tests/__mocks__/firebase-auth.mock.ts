import { vi } from 'vitest';

let onIdTokenChangedImpl = vi.fn();

export const onIdTokenChanged = vi.fn((_auth, callback) => {
  onIdTokenChangedImpl(_auth, callback);
  return vi.fn();
});

export function __setOnIdTokenChangedImpl(fn: unknown) {
  onIdTokenChangedImpl = fn as typeof onIdTokenChangedImpl;
}

export function __resetOnIdTokenChanged() {
  onIdTokenChangedImpl = vi.fn();
  onIdTokenChanged.mockClear();
}