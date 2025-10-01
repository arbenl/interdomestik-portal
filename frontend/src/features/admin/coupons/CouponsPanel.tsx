import { useState, useCallback } from 'react';
import { useCoupons } from '@/hooks/admin/useCoupons';
import { Button } from '@/components/ui';
import type { Coupon } from '@/types';

export function CouponsPanel({
  push,
}: {
  push: (t: { type: 'success' | 'error'; message: string }) => void;
}) {
  const { data: items, isLoading, error, create } = useCoupons();
  const [code, setCode] = useState('WELCOME');
  const [percent, setPercent] = useState(0);
  const [amount, setAmount] = useState(500);
  const [active, setActive] = useState(true);

  const handleCreate = useCallback(async () => {
    try {
      await create({ code, percentOff: percent, amountOff: amount, active });
      push({ type: 'success', message: 'Coupon saved' });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to save coupon';
      push({ type: 'error', message: msg });
    }
  }, [create, code, percent, amount, active, push]);

  if (isLoading) {
    return <div>Loading coupons...</div>;
  }

  if (error) {
    return <div>Error loading coupons: {error.message}</div>;
  }

  return (
    <div className="mb-6 p-4 border rounded bg-white">
      <h3 className="text-lg font-semibold mb-2">Coupons</h3>
      <div className="flex gap-2 items-end mb-3">
        <div>
          <label
            htmlFor="coupon-code"
            className="block text-sm font-medium text-gray-700"
          >
            Code
          </label>
          <input
            id="coupon-code"
            className="mt-1 border rounded px-3 py-2"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </div>
        <div>
          <label
            htmlFor="coupon-percent"
            className="block text-sm font-medium text-gray-700"
          >
            Percent Off
          </label>
          <input
            id="coupon-percent"
            type="number"
            className="mt-1 border rounded px-3 py-2 w-24"
            value={percent}
            onChange={(e) => setPercent(Number(e.target.value))}
          />
        </div>
        <div>
          <label
            htmlFor="coupon-amount"
            className="block text-sm font-medium text-gray-700"
          >
            Amount Off (cents)
          </label>
          <input
            id="coupon-amount"
            type="number"
            className="mt-1 border rounded px-3 py-2 w-32"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
          />
        </div>
        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
          />
          Active
        </label>
        <Button
          disabled={isLoading || !code}
          onClick={() => {
            void handleCreate();
          }}
        >
          Save Coupon
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-gray-600">
              <th className="px-3 py-2">Code</th>
              <th className="px-3 py-2">Percent</th>
              <th className="px-3 py-2">Amount Off</th>
              <th className="px-3 py-2">Active</th>
            </tr>
          </thead>
          <tbody>
            {items?.map((c: Coupon) => (
              <tr key={c.id} className="border-t">
                <td className="px-3 py-2 font-mono">{c.id}</td>
                <td className="px-3 py-2">{c.percentOff || 0}</td>
                <td className="px-3 py-2">{c.amountOff || 0}</td>
                <td className="px-3 py-2">
                  {c.active !== false ? 'yes' : 'no'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
