import { describe, it, beforeEach } from 'mocha';
import { expect } from 'chai';
import { admin, db } from '../src/firebaseAdmin';
import { verifyMembership, stripeWebhook } from '../src/index';

function makeRes() {
  let statusCode = 200;
  let body: any = undefined;
  const headers: Record<string, string> = {};
  const res = {
    set: (k: string, v: string) => { headers[k] = v; return res; },
    status: (c: number) => { statusCode = c; return res; },
    json: (b: any) => { body = b; return res; },
    send: (b: any) => { body = b; return res; },
    end: () => res,
  } as any;
  return { res, get: () => ({ statusCode, body, headers }) };
}

describe('HTTP functions', () => {
  beforeEach(async () => {
    // Clear targeted collections to reduce flakiness
    const members = await db.collection('members').get();
    await Promise.all(members.docs.map(async (d) => {
      const subs = await d.ref.collection('memberships').get();
      await Promise.all(subs.docs.map((s) => s.ref.delete()));
      await d.ref.delete();
    }));
    const billing = await db.collection('billing').get();
    await Promise.all(billing.docs.map(async (d) => {
      const inv = await d.ref.collection('invoices').get();
      await Promise.all(inv.docs.map((s) => s.ref.delete()));
      await d.ref.delete();
    }));
  });

  it('verifyMembership returns valid for active member', async () => {
    const uid = 'u_verify_' + Date.now();
    const memberNo = 'INT-2025-123456';
    await db.collection('members').doc(uid).set({
      email: 'vm@example.com', name: 'VM', region: 'PRISHTINA', memberNo,
      createdAt: admin.firestore.Timestamp.now(), updatedAt: admin.firestore.Timestamp.now(),
    });
    const tomorrow = admin.firestore.Timestamp.fromDate(new Date(Date.now() + 24 * 3600 * 1000));
    await db.collection('members').doc(uid).collection('memberships').doc('2025').set({
      status: 'active', startedAt: admin.firestore.Timestamp.now(), expiresAt: tomorrow,
    });

    const req: any = { method: 'GET', query: { memberNo } };
    const { res, get } = makeRes();
    await (verifyMembership as any)(req, res);
    const out = get();
    expect(out.statusCode).to.equal(200);
    expect(out.body).to.have.property('ok', true);
    expect(out.body).to.have.property('valid', true);
    expect(out.body).to.have.property('memberNo', memberNo);
  });

  it('verifyMembership supports signed token and revocation', async () => {
    const { signCardToken } = await import('../src/lib/tokens');
    process.env.CARD_JWT_SECRET = 'test-secret';
    const uid = 'u_token_' + Date.now();
    const memberNo = 'INT-2025-654321';
    await db.collection('members').doc(uid).set({
      email: 'vt@example.com', name: 'VT', region: 'PRISHTINA', memberNo,
      createdAt: admin.firestore.Timestamp.now(), updatedAt: admin.firestore.Timestamp.now(),
    });
    const tomorrow = admin.firestore.Timestamp.fromDate(new Date(Date.now() + 24 * 3600 * 1000));
    await db.collection('members').doc(uid).collection('memberships').doc('2025').set({
      status: 'active', startedAt: admin.firestore.Timestamp.now(), expiresAt: tomorrow,
    });

    // valid token
    const t = signCardToken({ mno: memberNo, exp: Math.floor(Date.now()/1000) + 3600, jti: 'test_jti_ok' });
    const req1: any = { method: 'GET', query: { token: t }, headers: {} };
    const { res: res1, get: get1 } = makeRes();
    await (verifyMembership as any)(req1, res1);
    const out1 = get1();
    expect(out1.statusCode).to.equal(200);
    expect(out1.body).to.have.property('ok', true);
    expect(out1.body).to.have.property('valid', true);

    // revoked token
    await db.collection('card_revocations').doc('test_jti_rev').set({ reason: 'test' });
    const tRev = signCardToken({ mno: memberNo, exp: Math.floor(Date.now()/1000) + 3600, jti: 'test_jti_rev' });
    const req2: any = { method: 'GET', query: { token: tRev }, headers: {} };
    const { res: res2, get: get2 } = makeRes();
    await (verifyMembership as any)(req2, res2);
    const out2 = get2();
    expect(out2.statusCode).to.equal(200);
    expect(out2.body).to.have.property('ok', true);
    expect(out2.body).to.have.property('valid', false);
  });

  it('stripeWebhook writes a paid invoice', async () => {
    const uid = 'u_invoice_' + Date.now();
    await admin.auth().createUser({ uid, email: `u_${Date.now()}@example.com` }).catch(() => {});
    // Ensure parent billing doc exists (not required, but clearer)
    await db.collection('billing').doc(uid).set({});
    const invoiceId = 'inv_' + Date.now();

    const req: any = { method: 'POST', body: { uid, invoiceId, amount: 2500, currency: 'EUR' } };
    const { res, get } = makeRes();
    await (stripeWebhook as any)(req, res);
    const out = get();
    expect(out.statusCode).to.equal(200);
    expect(out.body).to.have.property('ok', true);

    const snap = await db.collection('billing').doc(uid).collection('invoices').doc(invoiceId).get();
    expect(snap.exists).to.equal(true);
    const data = snap.data()!;
    expect(data.status).to.equal('paid');
    expect(data.amount).to.equal(2500);
    expect(data.currency).to.equal('EUR');
  });
});
