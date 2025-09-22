import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useMemberProfile } from '@/hooks/useMemberProfile';
import { useInvoices } from '@/hooks/useInvoices';
import { useToast } from '@/components/ui/useToast';
import { Button } from '@/components/ui';
import PaymentElementBox from '@/components/payments/PaymentElementBox';
import { functions } from '@/lib/firebase';
import { httpsCallable } from 'firebase/functions';
import type { Invoice } from '@/types';

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount / 100);
  } catch {
    return `${(amount / 100).toFixed(2)} ${currency}`;
  }
}

function getStripeWebhookUrl(projectId: string) {
  const isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  // If served via Hosting emulator (port 5000), the rewrite works at /stripeWebhook
  if (isLocal && location.port === '5000') return `${location.origin}/stripeWebhook`;
  // Otherwise, call Functions emulator directly
  if (isLocal) return `http://localhost:5001/${projectId}/europe-west1/stripeWebhook`;
  // In production, Hosting rewrite handles /stripeWebhook
  return '/stripeWebhook';
}

export default function Billing() {
  const { user } = useAuth();
  const { data: profile } = useMemberProfile(user?.uid);
  const { data: invoices, isLoading, error, refetch } = useInvoices(user?.uid);
  const { push } = useToast();
  const [busy, setBusy] = useState(false);
  const projectId = (import.meta.env.VITE_FIREBASE_PROJECT_ID as string) || 'demo-interdomestik';
  const ENABLE_PAYMENTS_UI = String(import.meta.env.VITE_ENABLE_PAYMENTS_UI ?? 'true') === 'true';

  async function simulatePayment() {
    if (!user) return;
    setBusy(true);
    try {
      const url = getStripeWebhookUrl(projectId);
      const body = {
        uid: user.uid,
        invoiceId: `inv_${Date.now()}`,
        amount: 2500, // cents
        currency: 'EUR',
        created: new Date().toISOString(),
      };
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`Webhook error: ${res.status}`);
      await new Promise<void>((r) => setTimeout(r, 300));
      localStorage.setItem('renewed_at', String(Date.now()));
      void refetch();
      push({ type: 'success', message: 'Payment recorded. Membership activated.' });
    } catch (e) {
      console.error(e);
      push({ type: 'error', message: `Failed to simulate payment` });
    } finally {
      setBusy(false);
    }
  }

  if (!user) {
    return (
      <div className="max-w-3xl">
        <h1 className="text-2xl font-bold mb-3">Billing & Subscription</h1>
        <p className="text-gray-600 mb-4">Please sign in to view billing.</p>
        <a className="text-indigo-600 underline" href="/signin">Go to Sign In</a>
      </div>
    );
  }

  const name = profile?.name || user.displayName || 'Member';
  const expiresAtSec = profile?.expiresAt?.seconds;
  const expiry = typeof expiresAtSec === 'number' ? new Date(expiresAtSec * 1000).toISOString().slice(0, 10) : '—';

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold mb-1">Billing & Subscription</h1>
      <p className="text-gray-600 mb-4">Manage your membership payments and invoices.</p>

      {ENABLE_PAYMENTS_UI && (
        <div className="mb-6">
          <PaymentElementBox amountCents={2500} currency="EUR" />
        </div>
      )}

      <div className="border rounded p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-500">Member</div>
            <div className="font-medium">{name}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Renewal date</div>
            <div className="font-medium">{expiry}</div>
          </div>
        </div>
        <div className="mt-3 text-sm text-gray-500">For local testing, use the button below to simulate a paid invoice via the emulator-friendly webhook.</div>
        <div className="mt-3 flex items-center gap-2">
          <Button onClick={() => { void simulatePayment(); }} disabled={busy}>
            {busy ? 'Simulating…' : 'Add test paid invoice'}
          </Button>
          <Button variant="ghost" onClick={() => { void (async ()=>{
            try {
              const fn = httpsCallable<{ uid?: string; year?: number }, { ok: boolean }>(functions, 'resendMembershipCard');
              await fn({});
              alert('Card email queued. Check your inbox.');
            } catch {
              alert('Failed to resend card');
            }
          })(); }}>Resend card email</Button>
        </div>
      </div>

      <h2 className="text-xl font-semibold mb-2">Invoices</h2>
      {isLoading && <div className="text-gray-600">Loading…</div>}
      {error && (
        <div className="border border-red-300 bg-red-50 text-red-800 rounded p-2 mb-3">
          Failed to load invoices: {error.message}
        </div>
      )}
      {(!isLoading && invoices?.length === 0) ? (
        <div className="text-gray-600">No invoices yet.</div>
      ) : (
        <div className="divide-y border rounded">
          {invoices?.map((inv: Invoice) => (
            <div key={inv.id} className="p-3 flex items-center justify-between">
              <div>
                <div className="font-medium">{inv.id}</div>
                <div className="text-xs text-gray-500">{inv.created ? new Date(inv.created.seconds * 1000).toLocaleString() : ''}</div>
              </div>
              <div className="text-right">
                <div className="font-medium">{formatMoney(inv.amount || 0, inv.currency || 'EUR')}</div>
                <div className="text-xs uppercase tracking-wide text-gray-500">{inv.status || 'unknown'}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
