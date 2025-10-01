import * as functions from 'firebase-functions/v1';
import { admin } from '../firebaseAdmin';

type CreatePaymentIntentInput = {
  amount?: number; // base amount, cents
  currency?: string; // ISO 3-letter
  description?: string;
  mode?: 'renewal' | 'new';
  couponCode?: string; // optional coupon code
  donateCents?: number; // optional donation, cents
};

export async function createPaymentIntentLogic(
  data: CreatePaymentIntentInput,
  context: functions.https.CallableContext
) {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Sign in required');
  }
  const uid = context.auth.uid;
  const baseAmount = Number(data?.amount ?? 2500);
  const currency = String(data?.currency ?? 'EUR').toUpperCase();
  const description = String(data?.description ?? 'Membership payment');
  const donate = Math.max(0, Number(data?.donateCents ?? 0));
  const code = (data?.couponCode || '').toString().trim();

  if (!Number.isFinite(baseAmount) || baseAmount <= 0) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'amount must be a positive number (cents)'
    );
  }

  // Apply coupon if present
  let discount = 0;
  if (code) {
    const snap = await admin
      .firestore()
      .collection('coupons')
      .doc(code.toLowerCase())
      .get();
    if (snap.exists && snap.get('active') !== false) {
      const percent = Number(snap.get('percentOff') || 0);
      const amountOff = Number(snap.get('amountOff') || 0);
      if (percent > 0) discount = Math.floor((baseAmount * percent) / 100);
      if (amountOff > 0) discount = Math.max(discount, amountOff);
    }
  }

  const amount = Math.max(0, baseAmount + donate - discount);

  const hasStripeKey = !!process.env.STRIPE_API_KEY;
  if (!hasStripeKey) {
    // Emulator-friendly placeholder; no external call
    return {
      ok: true,
      mode: 'emulator',
      clientSecret: 'pi_test_client_secret_emulator',
      amount,
      currency,
      metadata: { uid, baseAmount, donate, discount, coupon: code || null },
      description,
    };
  }

  // Lazy import to avoid emulator hard dependency
  const Stripe = (await (Function('m', 'return import(m)') as any)('stripe'))
    .default;
  const stripe = new Stripe(process.env.STRIPE_API_KEY as string, {
    apiVersion: '2024-06-20' as any,
  });

  const pi = await stripe.paymentIntents.create({
    amount,
    currency: currency.toLowerCase(),
    description,
    automatic_payment_methods: { enabled: true },
    metadata: { uid, baseAmount, donate, discount, coupon: code || '' },
  });

  return { ok: true, clientSecret: pi.client_secret, id: pi.id };
}
