import { describe, it, expect } from 'vitest';
import { ProfileInput } from './profile';

describe('ProfileInput schema', () => {
  it('accepts valid data', () => {
    const res = ProfileInput.safeParse({
      name: 'John Doe',
      region: 'PRISHTINA',
      phone: '+38344111222',
      orgId: '',
    });
    expect(res.success).toBe(true);
  });

  it('rejects invalid data', () => {
    const res = ProfileInput.safeParse({
      name: 'J',
      region: 'INVALID',
      phone: 'x',
    });
    expect(res.success).toBe(false);
  });
});
