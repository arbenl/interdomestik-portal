import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';

let testEnv: any;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'interdomestik-dev',
    firestore: { host: '127.0.0.1', port: 8080, rules: (await import('fs')).readFileSync('firestore.rules', 'utf8') }
  });

  // Seed roles with rules disabled
  await testEnv.withSecurityRulesDisabled(async (ctx: any) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'users', 'admin-uid'), { role: 'admin', email: 'admin@example.com' });
    await setDoc(doc(db, 'users', 'agent-uid'), { role: 'agent', email: 'agent@example.com' });
    await setDoc(doc(db, 'users', 'member-uid'), { role: 'member', email: 'member@example.com' });

    await setDoc(doc(db, 'claims', 'c1'), { ownerUid: 'member-uid', status: 'open' });
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

describe('Firestore rules', () => {
  it('member can read own claim, not others', async () => {
    const memberCtx = testEnv.authenticatedContext('member-uid');
    const db = memberCtx.firestore();
    await assertSucceeds(getDoc(doc(db, 'claims', 'c1')));
    // seed another claim owned by someone else
    await testEnv.withSecurityRulesDisabled(async (ctx: any) => {
      const db2 = ctx.firestore();
      await setDoc(doc(db2, 'claims', 'c2'), { ownerUid: 'someone-else', status: 'open' });
    });
    await assertFails(getDoc(doc(db, 'claims', 'c2')));
  });

  it('agent can read any claim', async () => {
    const agentCtx = testEnv.authenticatedContext('agent-uid');
    const db = agentCtx.firestore();
    await assertSucceeds(getDoc(doc(db, 'claims', 'c1')));
  });

  it('admin can delete membership, member cannot', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx: any) => {
      const db = ctx.firestore();
      await setDoc(doc(db, 'memberships', 'm1'), { ownerUid: 'member-uid', status: 'active' });
    });
    const memberCtx = testEnv.authenticatedContext('member-uid');
    await assertFails(memberCtx.firestore().doc('memberships/m1').delete());

    const adminCtx = testEnv.authenticatedContext('admin-uid');
    await assertSucceeds(adminCtx.firestore().doc('memberships/m1').delete());
  });
});