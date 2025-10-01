import { expect } from 'chai';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const functionsTest = require('firebase-functions-test');
import { admin, db } from '../src/firebaseAdmin';
import {
  getPortalDashboard,
  getPortalLayout,
  upsertPortalLayout,
} from '../src/index';

const testEnv = functionsTest({ projectId: 'interdomestik-dev' });

describe('portal dashboard callables', () => {
  const adminCtx = {
    auth: {
      uid: 'admin-dashboard',
      token: { role: 'admin', allowedRegions: ['PRISHTINA', 'PEJA'] },
    },
  } as any;
  const memberCtx = {
    auth: { uid: 'member-dashboard', token: { role: 'member' } },
  } as any;

  before(async () => {
    const now = Date.now();
    const expiresSoon = admin.firestore.Timestamp.fromDate(
      new Date(now + 15 * 24 * 60 * 60 * 1000)
    );

    await db.collection('members').doc('member-renewal').set({
      status: 'active',
      expiresAt: expiresSoon,
      region: 'PRISHTINA',
    });

    await db.collection('members').doc('member-expired').set(
      {
        status: 'expired',
        region: 'PRISHTINA',
      },
      { merge: true }
    );

    await db.collection('audit_logs').add({
      action: 'startMembership',
      amount: 200,
      currency: 'EUR',
      region: 'PRISHTINA',
      ts: admin.firestore.Timestamp.fromDate(
        new Date(now - 3 * 24 * 60 * 60 * 1000)
      ),
    });
    await db.collection('audit_logs').add({
      action: 'startMembership',
      amount: 100,
      currency: 'EUR',
      region: 'PRISHTINA',
      ts: admin.firestore.Timestamp.fromDate(
        new Date(now - 10 * 24 * 60 * 60 * 1000)
      ),
    });

    await db.collection('events').add({
      title: 'Compliance Summit',
      startAt: admin.firestore.Timestamp.fromDate(
        new Date(now + 5 * 24 * 60 * 60 * 1000)
      ),
      createdAt: admin.firestore.Timestamp.now(),
      location: 'PRISHTINA',
    });
  });

  after(() => {
    testEnv.cleanup();
  });

  it('denies non-admin/agent access', async () => {
    const wrapDashboard = testEnv.wrap(getPortalDashboard as any);
    try {
      await wrapDashboard({}, memberCtx);
      throw new Error('should have thrown');
    } catch (error: any) {
      expect(error).to.have.property('code', 'permission-denied');
    }
  });

  it('returns aggregated widget data for admins', async () => {
    const wrapDashboard = testEnv.wrap(getPortalDashboard as any);
    const result = (await wrapDashboard({}, adminCtx)) as any;
    expect(result).to.have.property('widgets');
    const renewals = result.widgets.find((w: any) => w.id === 'renewalsDue');
    expect(renewals?.value).to.equal('1');
    const payments = result.widgets.find(
      (w: any) => w.id === 'paymentsCaptured'
    );
    expect(payments?.value).to.match(/€200\.00|EUR 200\.00|€ 200\.00/);
  });

  it('returns default layout when none stored', async () => {
    const wrapLayout = testEnv.wrap(getPortalLayout as any);
    const layout = (await wrapLayout({}, adminCtx)) as any;
    expect(layout.widgets).to.be.an('array').with.length.greaterThan(0);
    expect(layout.widgets[0]).to.deep.include({ id: 'renewalsDue' });
  });

  it('persists a sanitized layout', async () => {
    const wrapUpsert = testEnv.wrap(upsertPortalLayout as any);
    const saved = (await wrapUpsert(
      {
        widgets: [
          { id: 'churnRisk' },
          { id: 'renewalsDue' },
          { id: 'churnRisk' },
        ],
      },
      adminCtx
    )) as any;
    expect(saved.widgets[0].id).to.equal('churnRisk');
    expect(saved.widgets.map((w: any) => w.id)).to.include.members([
      'renewalsDue',
      'eventRegistrations',
      'paymentsCaptured',
    ]);

    const doc = await db
      .collection('portalLayouts')
      .doc('admin-dashboard')
      .get();
    expect(doc.exists).to.equal(true);
    const wrapLayout = testEnv.wrap(getPortalLayout as any);
    const layout = (await wrapLayout({}, adminCtx)) as any;
    expect(layout.widgets[0].id).to.equal('churnRisk');
  });
});
