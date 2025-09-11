import { expect } from 'chai';
import { createPaymentIntentLogic as createPI } from '../src/lib/payments';
import * as functions from 'firebase-functions/v1';
import { db } from '../src/firebaseAdmin';

describe('payments: createPaymentIntentLogic (emulator)', () => {
  const ctx = { auth: { uid: 'u_test', token: {} as any } } as functions.https.CallableContext;
  before(async () => {
    delete process.env.STRIPE_API_KEY; // force emulator mode
    await db.collection('coupons').doc('save10').set({ percentOff: 10, active: true });
    await db.collection('coupons').doc('off500').set({ amountOff: 500, active: true });
  });

  it('applies donation and percent coupon', async () => {
    const r: any = await createPI({ amount: 2500, currency: 'EUR', donateCents: 200, couponCode: 'save10' }, ctx);
    expect(r.ok).to.equal(true);
    // 2500 + 200 - 250 = 2450
    expect(r.amount).to.equal(2450);
    expect(r.metadata.coupon).to.equal('save10');
  });

  it('applies amountOff coupon if larger', async () => {
    const r: any = await createPI({ amount: 2500, currency: 'EUR', donateCents: 0, couponCode: 'off500' }, ctx);
    expect(r.ok).to.equal(true);
    // 2500 - 500 = 2000
    expect(r.amount).to.equal(2000);
  });
});

