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
      await setDoc(doc(db, 'assistantSessions', 'member-uid'), { uid: 'member-uid', updatedAt: { seconds: 1 } });
      await setDoc(doc(db, 'assistantSessions', 'member-uid', 'messages', 'm1'), { role: 'assistant', content: 'Hello', createdAt: { seconds: 1 } });
      await setDoc(doc(db, 'portalLayouts', 'member-uid'), { widgets: [{ id: 'renewalsDue' }] });
      await setDoc(doc(db, 'automationLogs', 'log-1'), {
        url: 'https://example.com',
        windowDays: 30,
        count: 5,
        status: '200',
        dispatchedAt: { seconds: 1 },
        actor: 'automation',
      });
      await setDoc(doc(db, 'automationAlerts', 'alert-1'), {
        url: 'https://example.com/hooks/renewals',
        windowDays: 10,
        count: 3,
        status: '503',
        severity: 'critical',
        createdAt: { seconds: 1 },
        message: 'Renewal webhook dispatch responded with status 503',
        actor: 'automation',
        acknowledged: false,
      });
      await setDoc(doc(db, 'documentShares', 'share-1'), {
        ownerUid: 'admin-uid',
        fileName: 'policy.pdf',
        storagePath: 'documents/policy.pdf',
        allowedUids: ['member-uid'],
        recipients: [{ uid: 'member-uid', name: 'Member', region: 'EU' }],
        createdAt: { seconds: 1 },
        updatedAt: { seconds: 1 },
      });
      await setDoc(doc(db, 'documentShares', 'share-1', 'activity', 'event-1'), {
        action: 'created',
        actorUid: 'admin-uid',
        createdAt: { seconds: 1 },
      });
      await setDoc(doc(db, 'assistantTelemetry', 'entry-1'), {
        uid: 'assistant-member',
        role: 'member',
        latencyMs: 240,
        fallback: false,
        createdAt: { seconds: 1 },
        promptLength: 20,
        sessionRef: 'assistantSessions/assistant-member',
        messageRef: 'assistantSessions/assistant-member/messages/m1',
      });
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

    it('portal layouts: owners and admins can read/write, others blocked', async () => {
      const memberCtx = testEnv!.authenticatedContext('member-uid');
      const dbMember = memberCtx.firestore();
      await assertSucceeds(getDoc(doc(dbMember, 'portalLayouts', 'member-uid')));
      await assertSucceeds(setDoc(doc(dbMember, 'portalLayouts', 'member-uid'), { widgets: [{ id: 'renewalsDue' }, { id: 'churnRisk', hidden: true }] }));
      await assertFails(setDoc(doc(dbMember, 'portalLayouts', 'other-uid'), { widgets: [] }));

      const adminCtx = testEnv!.authenticatedContext('admin-uid', ADMIN_CLAIMS);
      const dbAdmin = adminCtx.firestore();
      await assertSucceeds(getDoc(doc(dbAdmin, 'portalLayouts', 'member-uid')));
      await assertSucceeds(setDoc(doc(dbAdmin, 'portalLayouts', 'member-uid'), { widgets: [{ id: 'eventRegistrations' }] }));

      const unauth = testEnv!.unauthenticatedContext();
      const dbU = unauth.firestore();
      await assertFails(getDoc(doc(dbU, 'portalLayouts', 'member-uid')));
    });

    it('assistant sessions: owners and admins can read, no client writes', async () => {
      const memberCtx = testEnv!.authenticatedContext('member-uid');
      const dbMember = memberCtx.firestore();
      await assertSucceeds(getDoc(doc(dbMember, 'assistantSessions', 'member-uid')));
      await assertSucceeds(getDoc(doc(dbMember, 'assistantSessions', 'member-uid', 'messages', 'm1')));
      await assertFails(setDoc(doc(dbMember, 'assistantSessions', 'member-uid'), { role: 'member' }));
      await assertFails(setDoc(doc(dbMember, 'assistantSessions', 'member-uid', 'messages', 'm2'), { role: 'user' }));

      const adminCtx = testEnv!.authenticatedContext('admin-uid', ADMIN_CLAIMS);
      const dbAdmin = adminCtx.firestore();
      await assertSucceeds(getDoc(doc(dbAdmin, 'assistantSessions', 'member-uid')));

      const otherCtx = testEnv!.authenticatedContext('other-uid');
      const dbOther = otherCtx.firestore();
      await assertFails(getDoc(doc(dbOther, 'assistantSessions', 'member-uid')));
    });

    it('document shares: owner, recipients, and admins can read metadata and activity', async () => {
      const ownerCtx = testEnv!.authenticatedContext('admin-uid', ADMIN_CLAIMS);
      const ownerDb = ownerCtx.firestore();
      await assertSucceeds(getDoc(doc(ownerDb, 'documentShares', 'share-1')));
      await assertSucceeds(getDoc(doc(ownerDb, 'documentShares', 'share-1', 'activity', 'event-1')));

      const recipientCtx = testEnv!.authenticatedContext('member-uid');
      const recipientDb = recipientCtx.firestore();
      await assertSucceeds(getDoc(doc(recipientDb, 'documentShares', 'share-1')));
      await assertSucceeds(getDoc(doc(recipientDb, 'documentShares', 'share-1', 'activity', 'event-1')));

      const otherCtx = testEnv!.authenticatedContext('other-uid');
      const otherDb = otherCtx.firestore();
      await assertFails(getDoc(doc(otherDb, 'documentShares', 'share-1')));
    });

    it('automation logs: admin-only read', async () => {
      const adminCtx = testEnv!.authenticatedContext('admin-uid', ADMIN_CLAIMS);
      const adminDb = adminCtx.firestore();
      await assertSucceeds(getDoc(doc(adminDb, 'automationLogs', 'log-1')));
      await assertSucceeds(getDoc(doc(adminDb, 'automationAlerts', 'alert-1')));

      const memberCtx = testEnv!.authenticatedContext('member-uid');
      const memberDb = memberCtx.firestore();
      await assertFails(getDoc(doc(memberDb, 'automationLogs', 'log-1')));
      await assertFails(getDoc(doc(memberDb, 'automationAlerts', 'alert-1')));
    });

    it('assistant telemetry: admin-only read', async () => {
      const adminCtx = testEnv!.authenticatedContext('admin-uid', ADMIN_CLAIMS);
      const adminDb = adminCtx.firestore();
      await assertSucceeds(getDoc(doc(adminDb, 'assistantTelemetry', 'entry-1')));

      const memberCtx = testEnv!.authenticatedContext('member-uid');
      const memberDb = memberCtx.firestore();
      await assertFails(getDoc(doc(memberDb, 'assistantTelemetry', 'entry-1')));
    });
  });
