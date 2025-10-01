import { expect } from 'chai';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const functionsTest = require('firebase-functions-test');
import { admin, db } from '../src/firebaseAdmin';
import {
  createCoupon,
  listCoupons,
  resendMembershipCard,
  startAssistantSuggestion,
} from '../src/index';
import { activateMembership } from '../src/lib/startMembership';

const testEnv = functionsTest({ projectId: 'interdomestik-dev' });

async function clearCollection(path: string) {
  const docs = await db.collection(path).listDocuments();
  await Promise.all(docs.map((docRef) => docRef.delete()));
}

describe('admin callables', () => {
  const adminCtx = { auth: { uid: 'admin', token: { role: 'admin' } } } as any;
  const userCtx = { auth: { uid: 'user1', token: { role: 'member' } } } as any;

  it('createCoupon/listCoupons enforce admin-only', async () => {
    const wrapCreate = testEnv.wrap(createCoupon as any);
    const wrapList = testEnv.wrap(listCoupons as any);
    // Non-admin should be denied
    try {
      await wrapCreate({ code: 'welcome', amountOff: 500 }, userCtx);
      throw new Error('should have thrown');
    } catch (e: any) {
      expect(e.code).to.equal('permission-denied');
    }
    // Admin OK
    await wrapCreate({ code: 'welcome', amountOff: 500 }, adminCtx);
    const list = await wrapList(undefined, adminCtx);
    expect((list as any)?.items).to.be.an('array');
  });

  it('resendMembershipCard works for self and admin, and fails without active membership', async () => {
    // Seed user with active membership
    const uid = 'u_rc_' + Date.now();
    await admin
      .auth()
      .createUser({ uid, email: `rc_${Date.now()}@example.com` })
      .catch(() => {});
    await db
      .collection('members')
      .doc(uid)
      .set({
        email: `rc_${Date.now()}@example.com`,
        name: 'RC',
        memberNo: 'INT-2025-777777',
        region: 'PRISHTINA',
      });
    const year = new Date().getUTCFullYear();
    await activateMembership(uid, year, 25, 'EUR', 'cash', null);

    const wrapResend = testEnv.wrap(resendMembershipCard as any);
    // Self context
    const selfCtx = { auth: { uid, token: { role: 'member' } } } as any;
    const r1 = await wrapResend({}, selfCtx);
    expect(r1.ok).to.equal(true);
    // Admin for target uid
    const r2 = await wrapResend({ uid }, adminCtx);
    expect(r2.ok).to.equal(true);

    // Failure when no active membership
    const uid2 = 'u_rc_fail_' + Date.now();
    await admin
      .auth()
      .createUser({ uid: uid2, email: `rcf_${Date.now()}@example.com` })
      .catch(() => {});
    await db
      .collection('members')
      .doc(uid2)
      .set({
        email: `rcf_${Date.now()}@example.com`,
        name: 'NoActive',
        memberNo: 'INT-2025-888888',
        region: 'PRISHTINA',
      });
    try {
      await wrapResend({}, {
        auth: { uid: uid2, token: { role: 'member' } },
      } as any);
      throw new Error('should have thrown');
    } catch (e: any) {
      expect(e.code).to.equal('failed-precondition');
    }
  });
});

describe('assistant callables', () => {
  const memberCtx = {
    auth: { uid: 'assistant-member', token: { role: 'member' } },
  } as any;
  const adminCtx = {
    auth: { uid: 'assistant-admin', token: { role: 'admin' } },
  } as any;

  beforeEach(async () => {
    await clearCollection('assistantTelemetry');
  });

  it('rejects unauthenticated requests', async () => {
    const wrap = testEnv.wrap(startAssistantSuggestion as any);
    try {
      await wrap({ prompt: 'hello' }, { auth: null } as any);
      throw new Error('expected unauthenticated error');
    } catch (error: any) {
      expect(error.code).to.equal('unauthenticated');
    }
  });

  it('stores conversation and returns contextual guidance', async () => {
    const wrap = testEnv.wrap(startAssistantSuggestion as any);
    const result = (await wrap(
      { prompt: 'How do I renew a membership?' },
      adminCtx
    )) as any;
    expect(result.reply).to.match(/renew/i);
    const log = await db
      .collection('assistantSessions')
      .doc('assistant-admin')
      .collection('messages')
      .limit(2)
      .get();
    expect(log.docs.length).to.be.greaterThan(0);
    expect(result.latencyMs).to.be.greaterThan(0);

    const sessionDoc = await db
      .collection('assistantSessions')
      .doc('assistant-admin')
      .get();
    expect(sessionDoc.get('metrics.lastLatencyMs')).to.be.greaterThan(0);
    expect(sessionDoc.get('metrics.requestCount')).to.equal(1);

    const telemetrySnap = await db
      .collection('assistantTelemetry')
      .where('uid', '==', 'assistant-admin')
      .get();
    expect(telemetrySnap.empty).to.equal(false);
    expect(telemetrySnap.docs[0].get('latencyMs')).to.be.greaterThan(0);
  });

  it('provides member-friendly fallback messaging', async () => {
    const wrap = testEnv.wrap(startAssistantSuggestion as any);
    const result = (await wrap(
      { prompt: 'hello assistant' },
      memberCtx
    )) as any;
    expect(result.reply).to.match(/membership|billing/i);
  });
});

after(() => {
  testEnv.cleanup();
});
