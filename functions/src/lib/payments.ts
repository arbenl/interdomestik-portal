import * as functions from 'firebase-functions/v1';
import { admin } from '../firebaseAdmin';

type CreatePaymentIntentInput = {
  amount?: number; // cents
  currency?: string; // ISO 3-letter
  description?: string;
  mode?: 'renewal' | 'new';
};

export async function createPaymentIntentLogic(data: CreatePaymentIntentInput, context: functions.https.CallableContext) {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Sign in required');
  }
  const uid = context.auth.uid;
  const amount = Number(data?.amount ?? 2500);
  const currency = String(data?.currency ?? 'EUR').toUpperCase();
  const description = String(data?.description ?? 'Membership payment');

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new functions.https.HttpsError('invalid-argument', 'amount must be a positive number (cents)');
  }

  const hasStripeKey = !!process.env.STRIPE_API_KEY;
  if (!hasStripeKey) {
    // Emulator-friendly placeholder; no external call
    return {
      ok: true,
      mode: 'emulator',
      clientSecret: 'pi_test_client_secret_emulator',
      amount,
      currency,
      metadata: { uid },
      description,
    };
  }

  // Lazy import to avoid emulator hard dependency
  const Stripe = (await (Function('m', 'return import(m)') as any)('stripe')).default;
  const stripe = new Stripe(process.env.STRIPE_API_KEY as string, { apiVersion: '2024-06-20' as any });

  const pi = await stripe.paymentIntents.create({
    amount,
    currency: currency.toLowerCase(),
    description,
    automatic_payment_methods: { enabled: true },
    metadata: { uid },
  });

  return { ok: true, clientSecret: pi.client_secret, id: pi.id };
}

