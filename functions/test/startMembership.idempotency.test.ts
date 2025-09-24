import { expect } from 'chai';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const functionsTest = require('firebase-functions-test');
import { admin, db } from '../src/firebaseAdmin';
import { startMembership } from '../src/index';

const testEnv = functionsTest({ projectId: 'interdomestik-dev' });

describe('startMembership idempotency', () => {
  const adminCtx = { auth: { uid: 'admin', token: { role: 'admin' } } } as any;
  const year = new Date().getUTCFullYear();

  it('processes once and returns idempotent on repeat', async () => {
    const uid = 'u_idem_' + Date.now();
    await admin.auth().createUser({ uid, email: `idem_${Date.now()}@example.com` }).catch(()=>{});
    await db.collection('members').doc(uid).set({ email: `idem_${Date.now()}@example.com`, name: 'X', region: 'PRISHTINA', memberNo: 'INT-2025-999001' });

    const wrap = testEnv.wrap(startMembership as any);
    const r1 = await wrap({ uid, year, price: 25, currency: 'EUR', paymentMethod: 'cash' }, adminCtx);
    expect(r1).to.have.property('refPath');
    const r2 = await wrap({ uid, year, price: 25, currency: 'EUR', paymentMethod: 'cash' }, adminCtx);
    expect(r2).to.have.property('idempotent', true);
    // Only one audit log for this target/year by our admin
    const q = await db.collection('audit_logs').where('action','==','startMembership').where('target','==',uid).where('year','==',year).get();
    expect(q.size).to.equal(1);
  });
});
