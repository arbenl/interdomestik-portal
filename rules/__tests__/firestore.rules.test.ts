 import { describe, it, beforeAll, afterAll, expect } from 'vitest';
  import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
  import { collection, doc, getDoc, setDoc, getDocs, addDoc } from 'firebase/firestore';

  let testEnv: Awaited<ReturnType<typeof initializeTestEnvironment>> | null = null;
  const FIRESTORE_HOST = process.env.FIRESTORE_EMULATOR_HOST ?? '';

  if (!FIRESTORE_HOST) {
    console.warn('[rules-test] FIRESTORE_EMULATOR_HOST not set; skipping Firestore rules tests.');
  }

  const describeRules = FIRESTORE_HOST ? describe : describe.skip;
  const ADMIN_CLAIMS = { role: 'admin', allowedRegions: ['PRISHTINA', 'PEJA'] } as const;

  beforeAll(async () => {
    if (!FIRESTORE_HOST) return;

    const [host, portStr] = FIRESTORE_HOST.split(':');
    const port = Number(portStr ?? 8080);

    testEnv = await initializeTestEnvironment({
      projectId: 'interdomestik-dev',
      firestore: {
        host,
        port,
        rules: (await import('fs')).readFileSync('firestore.rules', 'utf8'),
      },
    });

    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, 'members', 'member-uid'), { name: 'Member', region: 'EU' });
      await setDoc(doc(db, 'members', 'other-uid'), { name: 'Other', region: 'EU' });
      await setDoc(doc(db, 'members', 'member-uid', 'memberships', '2025'), { status: 'active', year: 2025 });
      await setDoc(doc(db, 'billing', 'member-uid', 'invoices', 'inv1'), { amount: 2500, currency: 'EUR', status: 'paid' });
      await setDoc(doc(db, 'metrics', 'daily-2025-09-22'), { activations_total: 1 });
      await setDoc(doc(db, 'reports', 'r1'), { kind: 'summary' });
      await setDoc(doc(db, 'events', 'e1'), { title: 'Event', startAt: { seconds: 1 } });
      await setDoc(doc(db, 'exports', 'job-1'), { status: 'running', type: 'members', startedAt: { seconds: 1 } });
    });
  });

  afterAll(async () => {
    await testEnv?.cleanup?.();
  });

  describeRules('Firestore rules (aligned to app data model)', () => {
    it('member can read own profile, not others', async () => {
      const memberCtx = testEnv!.authenticatedContext('member-uid');
      const db = memberCtx.firestore();
      await assertSucceeds(getDoc(doc(db, 'members', 'member-uid')));
      await assertFails(getDoc(doc(db, 'members', 'other-uid')));
    });

    it('admin can read any profile', async () => {
      const adminCtx = testEnv!.authenticatedContext('admin-uid', ADMIN_CLAIMS);
      const db = adminCtx.firestore();
      await assertSucceeds(getDoc(doc(db, 'members', 'member-uid')));
      await assertSucceeds(getDoc(doc(db, 'members', 'other-uid')));
    });

    it('owner can read memberships, cannot write; admin writes blocked client-side', async () => {
      const memberCtx = testEnv!.authenticatedContext('member-uid');
      const db = memberCtx.firestore();
      await assertSucceeds(getDoc(doc(db, 'members', 'member-uid', 'memberships', '2025')));
      await assertFails(setDoc(doc(db, 'members', 'member-uid', 'memberships', '2025'), { status: 'expired' }));

      const adminCtx = testEnv!.authenticatedContext('admin-uid', ADMIN_CLAIMS);
      const dbAdmin = adminCtx.firestore();
      await assertFails(setDoc(doc(dbAdmin, 'members', 'member-uid', 'memberships', '2026'), { status: 'active' }));
    });

    it('billing invoices: owner and admin can read; no client writes', async () => {
      const memberCtx = testEnv!.authenticatedContext('member-uid');
      const db = memberCtx.firestore();
      await assertSucceeds(getDoc(doc(db, 'billing', 'member-uid', 'invoices', 'inv1')));
      await assertFails(setDoc(doc(db, 'billing', 'member-uid', 'invoices', 'inv2'), { amount: 100 }));

      const adminCtx = testEnv!.authenticatedContext('admin-uid', ADMIN_CLAIMS);
      const dbAdmin = adminCtx.firestore();
      await assertSucceeds(getDoc(doc(dbAdmin, 'billing', 'member-uid', 'invoices', 'inv1')));
    });

    it('events: authenticated users read; admin writes; unauthenticated cannot read', async () => {
      const unauth = testEnv!.unauthenticatedContext();
      const dbU = unauth.firestore();
      await assertFails(getDoc(doc(dbU, 'events', 'e1')));

      const memberCtx = testEnv!.authenticatedContext('member-uid');
      const db = memberCtx.firestore();
      await assertSucceeds(getDoc(doc(db, 'events', 'e1')));

      const adminCtx = testEnv!.authenticatedContext('admin-uid', ADMIN_CLAIMS);
      const dbAdmin = adminCtx.firestore();
      await assertSucceeds(setDoc(doc(dbAdmin, 'events', 'e2'), { title: 'New', startAt: { seconds: 2 } }));
    });

    it('metrics and reports: admin-only reads', async () => {
      const memberCtx = testEnv!.authenticatedContext('member-uid');
      const db = memberCtx.firestore();
      await assertFails(getDoc(doc(db, 'metrics', 'daily-2025-09-22')));
      await assertFails(getDoc(doc(db, 'reports', 'r1')));

      const adminCtx = testEnv!.authenticatedContext('admin-uid', ADMIN_CLAIMS);
      const dbAdmin = adminCtx.firestore();
      await assertSucceeds(getDoc(doc(dbAdmin, 'metrics', 'daily-2025-09-22')));
      await assertSucceeds(getDoc(doc(dbAdmin, 'reports', 'r1')));
    });

    it('exports: only admins can list or create', async () => {
      const memberCtx = testEnv!.authenticatedContext('member-uid');
      const dbMember = memberCtx.firestore();
      await assertFails(getDocs(collection(dbMember, 'exports')));
      await assertFails(addDoc(collection(dbMember, 'exports'), { status: 'running' }));

      const adminCtx = testEnv!.authenticatedContext('admin-uid', ADMIN_CLAIMS);
      const dbAdmin = adminCtx.firestore();
      await assertSucceeds(getDocs(collection(dbAdmin, 'exports')));
      await assertSucceeds(addDoc(collection(dbAdmin, 'exports'), { status: 'running', type: 'members' }));
    });
  });