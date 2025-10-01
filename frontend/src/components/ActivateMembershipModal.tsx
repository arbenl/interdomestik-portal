import React, { useState } from 'react';
import { callFn } from '../services/functionsClient';

interface ActivateMembershipModalProps {
  user: { id: string; email?: string };
  onClose: () => void;
  onSuccess: (message: string) => void;
}

const ActivateMembershipModal: React.FC<ActivateMembershipModalProps> = ({ user, onClose, onSuccess }) => {
  const [year, setYear] = useState(new Date().getFullYear());
  const [price, setPrice] = useState(0);
  const [currency] = useState('EUR');
  const [paymentMethod, setPaymentMethod] = useState<'cash'|'card'|'bank'|'other'>('cash');
  const [externalRef, setExternalRef] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await callFn('startMembership', { uid: user.id, year, price, currency, paymentMethod, externalRef: externalRef || null });
      onSuccess(`Membership activated for ${user.email || user.id}`);
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Activate Membership for {user.email}</h2>
        <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium">Year</label>
            <input type="number" value={year} onChange={e => setYear(parseInt(e.target.value))} className="mt-1 block w-full p-2 border rounded" />
          </div>
          <div>
            <label className="block text-sm font-medium">Price</label>
            <input type="number" value={price} onChange={e => setPrice(parseFloat(e.target.value))} className="mt-1 block w-full p-2 border rounded" />
          </div>
          <div>
            <label className="block text-sm font-medium">Currency</label>
            <input type="text" value={currency} disabled className="mt-1 block w-full p-2 border rounded bg-gray-100" />
          </div>
          <div>
            <label className="block text-sm font-medium">Payment Method</label>
            <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as 'cash'|'card'|'bank'|'other')} className="mt-1 block w-full p-2 border rounded">
              <option value="cash">Cash</option>
              <option value="bank">Bank Transfer</option>
              <option value="card">Card</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium">External Reference (optional)</label>
            <input type="text" value={externalRef} onChange={e => setExternalRef(e.target.value)} placeholder="bank txn id / Stripe id" className="mt-1 block w-full p-2 border rounded" />
          </div>
          {error && <p className="text-red-500">{error}</p>}
          <div className="flex justify-end space-x-4">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="px-4 py-2 rounded bg-blue-500 text-white hover:bg-blue-600 disabled:bg-gray-400">
              {isSubmitting ? 'Activating...' : 'Activate'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ActivateMembershipModal;
