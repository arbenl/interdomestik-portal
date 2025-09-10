import { useEffect, useRef, useState } from 'react';
import useToast from '../ui/useToast';
import Button from '../ui/Button';

declare global {
  interface Window { Stripe?: any }
}

type Props = {
  amountCents: number;
  currency: string;
};

export default function PaymentElementBox({ amountCents, currency }: Props) {
  const [loading, setLoading] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [succeeded, setSucceeded] = useState(false);
  const [stripeReady, setStripeReady] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined;
  const hasStripeKey = !!(stripeKey && stripeKey.trim());
  const { push } = useToast();

  // Dynamically load Stripe.js
  useEffect(() => {
    if (!hasStripeKey) return;
    if (window.Stripe) { setStripeReady(true); return; }
    const s = document.createElement('script');
    s.src = 'https://js.stripe.com/v3/';
    s.async = true;
    s.onload = () => setStripeReady(true);
    s.onerror = () => setError('Failed to load Stripe.js');
    document.head.appendChild(s);
    return () => { try { document.head.removeChild(s); } catch {} };
  }, [hasStripeKey]);

  async function ensureClientSecret() {
    if (clientSecret) return clientSecret;
    setLoading(true); setError(null);
    try {
      const { httpsCallable } = await import('firebase/functions');
      const { functions } = await import('../../firebase');
      const fn = httpsCallable<{ amount?: number; currency?: string; description?: string }, { ok: boolean; clientSecret?: string }>(functions, 'createPaymentIntent');
      const res = await fn({ amount: amountCents, currency, description: 'Membership renewal' });
      const cs = (res.data as any)?.clientSecret as string | undefined;
      if (!cs) throw new Error('No client secret returned');
      setClientSecret(cs);
      return cs;
    } finally {
      setLoading(false);
    }
  }

  async function mountElement() {
    if (!hasStripeKey) return;
    const cs = await ensureClientSecret();
    if (!cs) return;
    if (!window.Stripe) { setError('Stripe not ready'); return; }
    const stripe = window.Stripe(stripeKey);
    const elements = stripe.elements({ clientSecret: cs });
    const paymentEl = elements.create('payment');
    if (containerRef.current) {
      containerRef.current.innerHTML = '';
      paymentEl.mount(containerRef.current);
    }
    (window as any).__stripe = stripe; // debug
    (window as any).__elements = elements;
  }

  async function confirm() {
    setError(null);
    try {
      const stripe = (window as any).__stripe;
      const elements = (window as any).__elements;
      if (!stripe || !elements) { setError('Payment UI not ready'); return; }
      const { error: err, paymentIntent } = await stripe.confirmPayment({ elements, redirect: 'if_required' });
      if (err) { setError(err.message || 'Payment failed'); return; }
      if (paymentIntent?.status === 'succeeded' || paymentIntent?.status === 'processing' || paymentIntent?.status === 'requires_capture') {
        setSucceeded(true);
        try { localStorage.setItem('renewed_at', String(Date.now())); } catch {}
        push({ type: 'success', message: 'Payment succeeded. Membership will activate shortly.' });
      } else {
        setError(`Unexpected status: ${paymentIntent?.status || 'unknown'}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  if (!hasStripeKey) {
    return (
      <div className="border rounded p-4 bg-yellow-50">
        <div className="font-medium mb-1">Payments (emulator)</div>
        <div className="text-sm text-gray-700">No `VITE_STRIPE_PUBLISHABLE_KEY` configured. Use the emulator webhook button below to simulate a paid invoice.</div>
      </div>
    );
  }

  return (
    <div className="border rounded p-4 bg-white">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold">Pay with card</h2>
        <div className="text-sm text-gray-600">{(amountCents/100).toFixed(2)} {currency}</div>
      </div>
      {!clientSecret && (
        <Button disabled={loading || !stripeReady} onClick={mountElement}>
          {loading ? 'Preparing…' : (stripeReady ? 'Start Card Payment' : 'Loading Stripe…')}
        </Button>
      )}
      <div ref={containerRef} className="mt-3" />
      {clientSecret && !succeeded && (
        <div className="mt-3 flex items-center gap-2">
          <Button onClick={confirm}>Confirm Payment</Button>
          {error && <div className="text-sm text-red-600">{error}</div>}
        </div>
      )}
      {succeeded && (
        <div className="mt-3 border rounded p-3 bg-green-50 text-green-800">
          Payment succeeded. Your membership will be activated shortly, and your digital card sent by email.
        </div>
      )}
    </div>
  );
}
