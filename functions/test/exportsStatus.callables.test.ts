import { expect } from 'chai';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const functionsTest = require('firebase-functions-test');
import { admin, db } from '../src/firebaseAdmin';
import { getExportStatus, getMyExports } from '../src/index';

const testEnv = functionsTest({ projectId: 'interdomestik-dev' });

describe('exports status callables', () => {
  const adminUid = 'admin-exports-' + Date.now();
  const otherUid = 'other-exports-' + Date.now();
  const adminCtxWithMfa = {
    auth: { uid: adminUid, token: { role: 'admin', mfaEnabled: true } },
  } as any;
  const adminCtxNoMfa = {
    auth: { uid: adminUid, token: { role: 'admin', mfaEnabled: false } },
  } as any;

  before(async () => {
    await admin
      .auth()
      .createUser({ uid: adminUid, email: `${adminUid}@example.com` })
      .catch(() => {});
    await admin
      .auth()
      .createUser({ uid: otherUid, email: `${otherUid}@example.com` })
      .catch(() => {});
  });

  beforeEach(async () => {
    const docs = await db.collection('exports').listDocuments();
    for (const doc of docs) {
      await doc.delete();
    }
  });

  after(() => {
    testEnv.cleanup();
  });

  it('rejects admins without MFA enabled', async () => {
    const wrap = testEnv.wrap(getMyExports as any);
    try {
      await wrap({}, adminCtxNoMfa);
      throw new Error('expected MFA failure');
    } catch (error: any) {
      expect(error.code).to.equal('failed-precondition');
    }
  });

  it('returns recent exports for the authenticated admin', async () => {
    const now = admin.firestore.Timestamp.now();
    await db.collection('exports').doc('exp_a').set({
      type: 'members_csv',
      status: 'success',
      createdBy: adminUid,
      createdAt: now,
      finishedAt: now,
      rows: 10,
      size: 1000,
      url: 'https://storage.example.com/exp_a.csv',
    });
    await db.collection('exports').doc('exp_b').set({
      type: 'members_csv',
      status: 'running',
      createdBy: adminUid,
      createdAt: admin.firestore.Timestamp.fromMillis(
        Date.now() + 1000
      ),
    });
    await db.collection('exports').doc('exp_other').set({
      type: 'members_csv',
      status: 'success',
      createdBy: otherUid,
      createdAt: now,
    });

    const wrap = testEnv.wrap(getMyExports as any);
    const result = (await wrap({ limit: 5 }, adminCtxWithMfa)) as {
      jobs: Array<Record<string, unknown>>;
    };
    expect(result.jobs).to.be.an('array').with.length(2);
    expect(result.jobs[0].id).to.equal('exp_b');
    expect(result.jobs[0].status).to.equal('running');
    expect(result.jobs[1].id).to.equal('exp_a');
    expect(result.jobs[1].url).to.include('exp_a.csv');
  });

  it('fetches individual export status and hides missing docs', async () => {
    const now = admin.firestore.Timestamp.now();
    await db.collection('exports').doc('exp_c').set({
      type: 'members_csv',
      status: 'error',
      createdBy: adminUid,
      createdAt: now,
      error: 'boom',
      progress: { rows: 2, bytes: 123 },
    });

    const wrap = testEnv.wrap(getExportStatus as any);
    try {
      await wrap({ id: 'missing-id' }, adminCtxWithMfa);
      throw new Error('expected not found');
    } catch (error: any) {
      expect(error.code).to.equal('not-found');
    }

    const record = (await wrap(
      { id: 'exp_c' },
      adminCtxWithMfa
    )) as Record<string, unknown>;
    expect(record.id).to.equal('exp_c');
    expect(record.status).to.equal('error');
    expect((record.progress as any)?.rows).to.equal(2);
    expect(record.error).to.equal('boom');
  });
});
