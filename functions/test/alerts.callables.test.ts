import { expect } from 'chai';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const functionsTest = require('firebase-functions-test');
import { db } from '../src/firebaseAdmin';
import { acknowledgeAlert } from '../src/acknowledgeAlert';

describe('acknowledgeAlert callable', () => {
  const testEnv = functionsTest({ projectId: 'interdomestik-dev' });

  beforeEach(async () => {
    await db.collection('automationAlerts').doc('alert-1').set({
      message: 'Renewal webhook failing',
      severity: 'critical',
      status: '500',
      acknowledged: false,
    });
  });

  afterEach(async () => {
    const acknowledgements = await db
      .collection('alertAcknowledgements')
      .listDocuments();
    await Promise.all(acknowledgements.map((doc) => doc.delete()));
    await db.collection('automationAlerts').doc('alert-1').delete();
  });

  after(() => {
    testEnv.cleanup();
  });

  it('allows admins to acknowledge alerts', async () => {
    const wrapped = testEnv.wrap(acknowledgeAlert as any);
    const result = await wrapped(
      { alertId: 'alert-1' },
      { auth: { uid: 'admin-1', token: { role: 'admin' } } }
    );

    expect(result).to.have.property('acknowledged', true);
    expect(result).to.have.property('acknowledgedAt');

    const acknowledgementSnap = await db
      .collection('alertAcknowledgements')
      .doc('alert-1')
      .get();
    expect(acknowledgementSnap.exists).to.equal(true);
    expect(acknowledgementSnap.get('acknowledgedBy')).to.equal('admin-1');

    const alertSnap = await db
      .collection('automationAlerts')
      .doc('alert-1')
      .get();
    expect(alertSnap.get('acknowledged')).to.equal(true);
    expect(alertSnap.get('acknowledgedBy')).to.equal('admin-1');
  });

  it('rejects non-admin callers', async () => {
    const wrapped = testEnv.wrap(acknowledgeAlert as any);
    try {
      await wrapped(
        { alertId: 'alert-1' },
        { auth: { uid: 'agent-1', token: { role: 'agent' } } }
      );
      throw new Error('expected permission-denied');
    } catch (error: any) {
      expect(error.code).to.equal('permission-denied');
    }
  });

  it('requires authentication', async () => {
    const wrapped = testEnv.wrap(acknowledgeAlert as any);
    try {
      await wrapped({ alertId: 'alert-1' }, { auth: null });
      throw new Error('expected unauthenticated');
    } catch (error: any) {
      expect(error.code).to.equal('unauthenticated');
    }
  });
});
