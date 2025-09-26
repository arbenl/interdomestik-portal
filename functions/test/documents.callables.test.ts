import { expect } from 'chai';
import * as sinon from 'sinon';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const functionsTest = require('firebase-functions-test');
import { shareDocument } from '../src/index';
import { db } from '../src/firebaseAdmin';

describe('shareDocument callable', () => {
  const testEnv = functionsTest({ projectId: 'interdomestik-dev' });

  beforeEach(async () => {
    sinon.restore();
    await db.collection('members').doc('member-1').set({
      email: 'member1@example.com',
      name: 'Member One',
      region: 'PRISHTINA',
    });
    await db.collection('members').doc('member-2').set({
      email: 'member2@example.com',
      name: 'Member Two',
      region: 'PEJA',
    });
  });

  afterEach(async () => {
    const docs = await db.collection('documentShares').listDocuments();
    await Promise.all(docs.map(async docRef => {
      const activity = await docRef.collection('activity').listDocuments();
      await Promise.all(activity.map(child => child.delete()));
      await docRef.delete();
    }));
  });

  after(() => {
    sinon.restore();
    testEnv.cleanup();
  });

  it('allows admins to create document shares and logs recipients', async () => {
    const wrapped = testEnv.wrap(shareDocument as any);
    const result = await wrapped({
      fileName: 'statement.pdf',
      storagePath: 'documents/statement.pdf',
      recipients: [{ uid: 'member-1' }],
      note: 'Quarterly statement',
    }, { auth: { uid: 'admin-1', token: { role: 'admin' } } });

    expect(result.ok).to.equal(true);
    expect(result.id).to.be.a('string');
    expect(result.recipients).to.deep.equal(['member-1']);

    const shareSnap = await db.collection('documentShares').doc(result.id).get();
    expect(shareSnap.exists).to.equal(true);
    expect(shareSnap.get('ownerUid')).to.equal('admin-1');
    expect(shareSnap.get('allowedUids')).to.include.members(['member-1', 'admin-1']);

    const activitySnap = await db.collection('documentShares').doc(result.id).collection('activity').get();
    expect(activitySnap.empty).to.equal(false);
  });

  it('prevents agents from sharing outside their allowed regions', async () => {
    const wrapped = testEnv.wrap(shareDocument as any);
    try {
      await wrapped({
        fileName: 'policy.pdf',
        storagePath: 'documents/policy.pdf',
        recipients: [{ uid: 'member-2' }],
      }, { auth: { uid: 'agent-1', token: { role: 'agent', allowedRegions: ['PRISHTINA'] } } });
      throw new Error('expected permission-denied');
    } catch (error: any) {
      expect(error.code).to.equal('permission-denied');
    }
  });

  it('requires authentication', async () => {
    const wrapped = testEnv.wrap(shareDocument as any);
    try {
      await wrapped({
        fileName: 'policy.pdf',
        storagePath: 'documents/policy.pdf',
        recipients: [{ uid: 'member-1' }],
      }, { auth: null });
      throw new Error('expected unauthenticated error');
    } catch (error: any) {
      expect(error.code).to.equal('unauthenticated');
    }
  });
});
