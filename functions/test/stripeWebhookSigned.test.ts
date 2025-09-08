import { expect } from 'chai';
import { createHmac } from 'crypto';
import { admin, db } from '../src/firebaseAdmin';
import { stripeWebhook } from '../src/index';

function makeRes() {
  let statusCode = 200; let body: any; const headers: Record<string,string> = {};
  const res: any = {
    set: (k: string, v: string) => { headers[k] = v; return res; },
    setHeader: (k: string, v: string) => { headers[k] = v; return res; },
    status: (c: number) => { statusCode = c; return res; },
    json: (b: any) => { body = b; return res; },
    send: (b: any) => { body = b; return res; },
  };
  return { res, get: () => ({ statusCode, body, headers }) };
}

describe('stripeWebhook (signed mode)', () => {
  it('processes a signed invoice.payment_succeeded and is idempotent', async () => {
    // Arrange env + payload
    const SECRET = 'whsec_test_123';
    process.env.STRIPE_SIGNING_SECRET = SECRET;
    process.env.STRIPE_API_KEY = 'sk_test_dummy';
    const uid = 'u_stripe_1';
    const eventId = 'evt_test_signed_1';
    const ts = Math.floor(Date.now() / 1000);
    const payload = JSON.stringify({
      id: eventId,
      type: 'invoice.payment_succeeded',
      data: { object: { id: 'in_test_1', amount_paid: 2500, currency: 'eur', created: ts, metadata: { uid } } }
    });
    const sig = `t=${ts},v1=${createHmac('sha256', SECRET).update(`${ts}.${payload}`).digest('hex')}`;

    const req: any = { method: 'POST', headers: { 'stripe-signature': sig }, rawBody: Buffer.from(payload) };
    const { res, get } = makeRes();

    // Act #1
    await (stripeWebhook as any)(req, res);
    const out1 = get();
    expect(out1.statusCode).to.equal(200);
    expect(out1.body).to.have.property('ok', true);

    // Assert invoice write
    const invSnap = await db.collection('billing').doc(uid).collection('invoices').doc('in_test_1').get();
    expect(invSnap.exists).to.equal(true);
    expect(invSnap.data()!.status).to.equal('paid');

    // Act #2 (duplicate)
    const { res: res2, get: get2 } = makeRes();
    await (stripeWebhook as any)(req, res2);
    const out2 = get2();
    expect(out2.statusCode).to.equal(200);
    expect(out2.body).to.have.property('duplicate', true);
  });
});

