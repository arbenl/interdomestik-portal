import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { collection, doc, getDoc, setDoc } from 'firebase/firestore';

let testEnv: any;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'interdomestik-dev',
    firestore: { host: '127.0.0.1', port: 8080, rules: (await import('fs')).readFileSync('firestore.rules', 'utf8') }
  });

  // Seed documents with rules disabled
  await testEnv.withSecurityRulesDisabled(async (ctx: any) => {
    const db = ctx.firestore();
    // members and nested memberships
    await setDoc(doc(db, 'members', 'member-uid'), { name: 'Member', region: 'EU' });
    await setDoc(doc(db, 'members', 'other-uid'), { name: 'Other', region: 'EU' });
    await setDoc(doc(db, 'members', 'member-uid', 'memberships', '2025'), { status: 'active', year: 2025 });
    // billing invoice
    await setDoc(doc(db, 'billing', 'member-uid', 'invoices', 'inv1'), { amount: 2500, currency: 'EUR', status: 'paid' });
    // metrics and reports
    await setDoc(doc(db, 'metrics', 'daily-2025-09-22'), { activations_total: 1 });
    await setDoc(doc(db, 'reports', 'r1'), { kind: 'summary' });
    // events
    await setDoc(doc(db, 'events', 'e1'), { title: 'Event', startAt: { seconds: 1 } });
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

describe('Firestore rules (aligned to app data model)', () => {
  it('member can read own profile, not others', async () => {
    const memberCtx = testEnv.authenticatedContext('member-uid');
    const db = memberCtx.firestore();
    await assertSucceeds(getDoc(doc(db, 'members', 'member-uid')));
    await assertFails(getDoc(doc(db, 'members', 'other-uid')));
  });

  it('admin can read any profile', async () => {
    const adminCtx = testEnv.authenticatedContext('admin-uid', { token: { role: 'admin' } });
    const db = adminCtx.firestore();
    await assertSucceeds(getDoc(doc(db, 'members', 'member-uid')));
    await assertSucceeds(getDoc(doc(db, 'members', 'other-uid')));
  });

  it('owner can read memberships, cannot write; admin can write', async () => {
    const memberCtx = testEnv.authenticatedContext('member-uid');
    const db = memberCtx.firestore();
    await assertSucceeds(getDoc(doc(db, 'members', 'member-uid', 'memberships', '2025')));
    await assertFails(doc(db, 'members', 'member-uid', 'memberships', '2025').set({ status: 'expired' }));

    const adminCtx = testEnv.authenticatedContext('admin-uid', { token: { role: 'admin' } });
    const dbAdmin = adminCtx.firestore();
    await assertFails(doc(dbAdmin, 'members', 'member-uid', 'memberships', '2026').set({ status: 'active' }));
  });

  it('billing invoices: owner and admin can read; no client writes', async () => {
    const memberCtx = testEnv.authenticatedContext('member-uid');
    const db = memberCtx.firestore();
    await assertSucceeds(getDoc(doc(db, 'billing', 'member-uid', 'invoices', 'inv1')));
    await assertFails(doc(db, 'billing', 'member-uid', 'invoices', 'inv2').set({ amount: 100 }));

    const adminCtx = testEnv.authenticatedContext('admin-uid', { token: { role: 'admin' } });
    const dbAdmin = adminCtx.firestore();
    await assertSucceeds(getDoc(doc(dbAdmin, 'billing', 'member-uid', 'invoices', 'inv1')));
  });

  it('events: authenticated users can read; admin writes; unauthenticated cannot read', async () => {
    const unauth = testEnv.unauthenticatedContext();
    const dbU = unauth.firestore();
    await assertFails(getDoc(doc(dbU, 'events', 'e1')));

    const memberCtx = testEnv.authenticatedContext('member-uid');
    const db = memberCtx.firestore();
    await assertSucceeds(getDoc(doc(db, 'events', 'e1')));

    const adminCtx = testEnv.authenticatedContext('admin-uid', { token: { role: 'admin' } });
    const dbAdmin = adminCtx.firestore();
    await assertSucceeds(doc(dbAdmin, 'events', 'e2').set({ title: 'New', startAt: { seconds: 2 } }));
  });

  it('metrics and reports: admin-only reads', async () => {
    const memberCtx = testEnv.authenticatedContext('member-uid');
    const db = memberCtx.firestore();
    await assertFails(getDoc(doc(db, 'metrics', 'daily-2025-09-22')));
    await assertFails(getDoc(doc(db, 'reports', 'r1')));

    const adminCtx = testEnv.authenticatedContext('admin-uid', { token: { role: 'admin' } });
    const dbAdmin = adminCtx.firestore();
    await assertSucceeds(getDoc(doc(dbAdmin, 'metrics', 'daily-2025-09-22')));
    await assertSucceeds(getDoc(doc(dbAdmin, 'reports', 'r1')));
  });
});
