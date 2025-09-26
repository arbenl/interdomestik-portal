import { expect } from 'chai';
import * as sinon from 'sinon';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const functionsTest = require('firebase-functions-test');
import { triggerRenewalAutomations } from '../src/index';
import { db } from '../src/firebaseAdmin';

const testEnv = functionsTest({ projectId: 'interdomestik-dev' });

async function clearCollection(path: string) {
  const docs = await db.collection(path).listDocuments();
  await Promise.all(docs.map(docRef => docRef.delete()));
}

describe('automation hooks', () => {
  beforeEach(async () => {
    sinon.restore();
    await clearCollection('automationAlerts');
    await db.collection('members').doc('member-renewal').set({
      status: 'active',
      name: 'Upcoming Member',
      region: 'PRISHTINA',
      memberNo: 'INT-2025-999001',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    await db.collection('automationHooks').doc('renewals').set({
      enabled: true,
      targets: [
        { url: 'https://example.com/hooks/renewals', secret: 'test-secret', windowDays: 10 },
      ],
    });
  });

  afterEach(async () => {
    sinon.restore();
    await db.collection('automationHooks').doc('renewals').delete();
    await db.collection('members').doc('member-renewal').delete();
  });

  after(() => {
    testEnv.cleanup();
  });

  it('dispatches renewal hooks to configured targets', async () => {
    const fetchStub = sinon.stub(globalThis, 'fetch').resolves({ status: 200 } as any);
    const wrapped = testEnv.wrap(triggerRenewalAutomations as any);

    const result = await wrapped({}, { auth: { uid: 'admin-1', token: { role: 'admin' } } });

    expect(result.ok).to.equal(true);
    expect(fetchStub.calledOnce).to.equal(true);
    const [url, options] = fetchStub.firstCall.args as [string, RequestInit];
    expect(url).to.equal('https://example.com/hooks/renewals');
    expect(options?.method).to.equal('POST');
    expect(JSON.parse(String(options?.body)).members).to.have.lengthOf(1);
    fetchStub.restore();
  });

  it('skips when automation hooks disabled', async () => {
    await db.collection('automationHooks').doc('renewals').set({ enabled: false });
    const fetchStub = sinon.stub(globalThis, 'fetch');
    const wrapped = testEnv.wrap(triggerRenewalAutomations as any);

    const result = await wrapped({}, { auth: { uid: 'admin-1', token: { role: 'admin' } } });
    expect(result.ok).to.equal(true);
    expect(fetchStub.called).to.equal(false);
    fetchStub.restore();
  });

  it('records an automation alert when a target responds with an error status', async () => {
    const fetchStub = sinon.stub(globalThis, 'fetch').resolves({ status: 503 } as any);
    const wrapped = testEnv.wrap(triggerRenewalAutomations as any);

    await wrapped({}, { auth: { uid: 'admin-1', token: { role: 'admin' } } });

    const alerts = await db.collection('automationAlerts').get();
    expect(alerts.empty).to.equal(false);
    const alert = alerts.docs[0].data();
    expect(alert.status).to.equal('503');
    expect(alert.severity).to.equal('critical');
    fetchStub.restore();
  });
});
