import { vi } from 'vitest';
import type { User, IdTokenResult } from 'firebase/auth';

export const makeIdTokenResult = (
  partial: Partial<IdTokenResult> = {},
): IdTokenResult => {
  const claims = partial.claims ?? {};
  return {
    token: 'test-token',
    authTime: '1970-01-01T00:00:00.000Z',
    issuedAtTime: '1970-01-01T00:00:00.000Z',
    expirationTime: '2099-01-01T00:00:00.000Z',
    signInProvider: 'password',
    signInSecondFactor: null,
    ...partial,
    claims: {
      role: 'admin',
      allowedRegions: ['*'],
      ...claims,
    },
  };
};

export const makeUser = (
  overrides: Partial<User> = {},
  claimsPartial: Partial<IdTokenResult['claims']> = {},
): User => {
  const user: Pick<User, 'uid' | 'email' | 'getIdTokenResult'> = {
    uid: 'test-uid',
    email: 'test@example.com',
    getIdTokenResult: vi
      .fn()
      .mockResolvedValue(
        makeIdTokenResult({ claims: { ...claimsPartial } }),
      ),
    ...overrides,
  };

  return user as unknown as User;
};

export const mockSignedInUser = (role: 'admin' | 'agent' | 'member' = 'member') => {
  return makeUser(undefined, { role });
};