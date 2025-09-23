import { expect } from 'chai';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const functionsTest = require('firebase-functions-test');
import { db } from '../src/firebaseAdmin';
import { getCardKeyStatusCallable, revokeCardToken } from '../src/index';

const testEnv = functionsTest({ projectId: 'demo-interdomestik' });

describe('card keys callables', () => {
  const adminCtx = { auth: { uid: 'admin', token: { role: 'admin' } } } as any;
  const userCtx = { auth: { uid: 'user', token: { role: 'member' } } } as any;

  it('getCardKeyStatusCallable requires admin and returns structure', async () => {
    process.env.CARD_JWT_ACTIVE_KID = 'v2';
    process.env.CARD_JWT_SECRETS = JSON.stringify({ v1: 's1', v2: 's2' });
    const wrap = testEnv.wrap(getCardKeyStatusCallable as any);
    // Non-admin denied
    try {
      await wrap(undefined, userCtx);
      throw new Error('should throw');
    } catch (e: any) {
      expect(e.code).to.equal('permission-denied');
    }
    // Admin OK
    const res = await wrap(undefined, adminCtx);
    expect(res.activeKid).to.equal('v2');
    expect(res.kids).to.include('v1');
  });

  it('revokeCardToken writes revocation doc', async () => {
    const wrap = testEnv.wrap(revokeCardToken as any);
    await wrap({ jti: 'abc123', reason: 'lost' }, adminCtx);
    const doc = await db.collection('card_revocations').doc('abc123').get();
    expect(doc.exists).to.equal(true);
    expect(doc.get('reason')).to.equal('lost');
  });
});

