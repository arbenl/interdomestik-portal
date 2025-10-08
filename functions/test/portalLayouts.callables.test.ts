import { expect } from 'chai';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const functionsTest = require('firebase-functions-test');
import { db } from '../src/firebaseAdmin';
import { upsertPortalLayout } from '../src/index';

const testEnv = functionsTest({ projectId: 'interdomestik-dev' });

describe('upsertPortalLayout callable', () => {
  const adminCtx = {
    auth: { uid: 'widget-admin', token: { role: 'admin' } },
  } as any;

  after(async () => {
    await db.collection('portalLayouts').doc('widget-admin').delete();
    testEnv.cleanup();
  });

  it('rejects unauthenticated requests', async () => {
    const wrap = testEnv.wrap(upsertPortalLayout as any);
    try {
      await wrap({ widgets: [] }, {});
      throw new Error('should have thrown');
    } catch (error: any) {
      expect(error).to.have.property('code', 'unauthenticated');
    }
  });

  it('persists the provided layout for authenticated admins', async () => {
    const wrap = testEnv.wrap(upsertPortalLayout as any);
    await wrap(
      { widgets: [{ id: 'paymentsCaptured' }, { id: 'renewalsDue' }] },
      adminCtx
    );

    const doc = await db.collection('portalLayouts').doc('widget-admin').get();
    expect(doc.exists).to.equal(true);
    const widgets = (doc.data()?.widgets ?? []) as Array<{ id: string }>;
    expect(widgets.map((entry) => entry.id)).to.include.members([
      'paymentsCaptured',
      'renewalsDue',
    ]);
  });
});
