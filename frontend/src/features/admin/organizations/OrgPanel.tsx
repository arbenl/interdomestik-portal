import { useState, useCallback } from 'react';
import { useOrganizations } from '@/hooks/admin/useOrganizations';
import { Button } from '@/components/ui';
import type { Organization } from '@/types';

export function OrgPanel({
  push,
}: {
  push: (t: { type: 'success' | 'error'; message: string }) => void;
}) {
  const { data: items, isLoading, error, create } = useOrganizations();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [seats, setSeats] = useState(10);

  const handleCreate = useCallback(async () => {
    try {
      await create({ name, email, seats });
      setName('');
      setEmail('');
      setSeats(10);
      push({ type: 'success', message: 'Organization created' });
    } catch (e: unknown) {
      const msg =
        e instanceof Error ? e.message : 'Failed to create organization';
      push({ type: 'error', message: msg });
    }
  }, [create, name, email, seats, push]);

  if (isLoading) {
    return <div>Loading organizations...</div>;
  }

  if (error) {
    return <div>Error loading organizations: {error.message}</div>;
  }

  return (
    <div data-testid="orgs-panel" className="mb-6 p-4 border rounded bg-white">
      <h3 className="text-lg font-semibold mb-2">Organizations</h3>
      <div className="flex gap-2 items-end mb-3">
        <div>
          <label
            htmlFor="org-name"
            className="block text-sm font-medium text-gray-700"
          >
            Name
          </label>
          <input
            id="org-name"
            className="mt-1 border rounded px-3 py-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label
            htmlFor="org-email"
            className="block text-sm font-medium text-gray-700"
          >
            Billing Email
          </label>
          <input
            id="org-email"
            className="mt-1 border rounded px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label
            htmlFor="org-seats"
            className="block text-sm font-medium text-gray-700"
          >
            Seats
          </label>
          <input
            id="org-seats"
            type="number"
            className="mt-1 border rounded px-3 py-2 w-24"
            value={seats}
            onChange={(e) => setSeats(Number(e.target.value))}
          />
        </div>
        <Button
          disabled={isLoading || !name}
          onClick={() => {
            void handleCreate();
          }}
        >
          Create Org
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-gray-600">
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Seats</th>
              <th className="px-3 py-2">Active</th>
              <th className="px-3 py-2">Billing Email</th>
            </tr>
          </thead>
          <tbody>
            {items?.map((o: Organization) => (
              <tr key={o.id} className="border-t">
                <td className="px-3 py-2">{o.name}</td>
                <td className="px-3 py-2">{o.seats}</td>
                <td className="px-3 py-2">{o.activeSeats || 0}</td>
                <td className="px-3 py-2">{o.billingEmail || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
