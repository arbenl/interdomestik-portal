import { useEffect, useRef, useState } from 'react';
import { useToast } from '@/components/ui/useToast';
import { Button } from '@/components/ui';
import callFn from '@/services/functionsClient';

type StripeElements = { create: (type: 'payment') => { mount: (el: HTMLElement) => void } };
type StripeJS = {
  elements: (opts: { clientSecret: string }) => StripeElements;
  confirmPayment: (opts: { elements: unknown; redirect: 'if_required' }) => Promise<{ error?: { message?: string }; paymentIntent?: { status?: string } }>;
};

declare global {
  interface Window {
    Stripe?: (key: string) => StripeJS;
    __stripe?: StripeJS;
    __elements?: unknown;
  }
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
  const [donation, setDonation] = useState<number>(0);
  const [coupon, setCoupon] = useState<string>('');

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
    return () => { if (s.parentNode) { s.parentNode.removeChild(s); } };
  }, [hasStripeKey]);

  async function ensureClientSecret() {
    if (clientSecret) return clientSecret;
    setLoading(true); setError(null);
    try {
      const res = await callFn<{ clientSecret: string }, { amount: number; currency: string; description: string; donateCents: number; couponCode?: string }>('createPaymentIntent', { amount: amountCents, currency, description: 'Membership renewal', donateCents: donation, couponCode: coupon || undefined });
      const cs = res.clientSecret;
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
    window.__stripe = stripe; // debug
    window.__elements = elements;
  }

  async function confirm() {
    setError(null);
    try {
      const stripe = window.__stripe;
      const elements = window.__elements;
      if (!stripe || !elements) { setError('Payment UI not ready'); return; }
      const { error: err, paymentIntent } = await stripe.confirmPayment({ elements, redirect: 'if_required' });
      if (err) { setError(err.message || 'Payment failed'); return; }
      if (paymentIntent?.status === 'succeeded' || paymentIntent?.status === 'processing' || paymentIntent?.status === 'requires_capture') {
        setSucceeded(true);
    try { localStorage.setItem('renewed_at', String(Date.now())); } catch { /* ignore */ }
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
        <div className="text-sm text-gray-600">
          Total: {((amountCents + donation)/100).toFixed(2)} {currency}
        </div>
      </div>
      <div className="flex items-center gap-3 text-sm mb-3">
        <label className="inline-flex items-center gap-2">
          <span>Donation</span>
          <select className="border rounded px-2 py-1" value={donation} onChange={(e)=> setDonation(Number(e.target.value))}>
            <option value={0}>€0</option>
            <option value={200}>€2</option>
            <option value={500}>€5</option>
          </select>
        </label>
        <label className="inline-flex items-center gap-2">
          <span>Coupon</span>
          <input className="border rounded px-2 py-1" placeholder="CODE" value={coupon} onChange={(e)=> setCoupon(e.target.value)} />
        </label>
      </div>
      {!clientSecret && (
        <Button disabled={loading || !stripeReady} onClick={() => { void mountElement(); }}>
          {loading ? 'Preparing…' : (stripeReady ? 'Start Card Payment' : 'Loading Stripe…')}
        </Button>
      )}
      <div ref={containerRef} className="mt-3" />
      {clientSecret && !succeeded && (
        <div className="mt-3 flex items-center gap-2">
          <Button onClick={() => { void confirm(); }}>Confirm Payment</Button>
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