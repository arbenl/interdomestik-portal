import { describe, it, expect } from 'vitest';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
} from '/Users/arbenlila/development/interdomestik/interdomestik-member-portal/scripts/emulator/seed-data';

describe('Emulator: Sign in and guarded routes', () => {
  it.runIf(process.env.VITEST_EMU)(
    'should allow admin to sign in',
    async () => {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        ADMIN_EMAIL,
        ADMIN_PASSWORD
      );
      expect(userCredential.user).toBeDefined();
      const token = await userCredential.user.getIdTokenResult();
      expect(token.claims.role).toBe('admin');
    }
  );
});
