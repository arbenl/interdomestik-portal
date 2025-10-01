import { useState } from 'react';
import { callFn } from '../services/functionsClient';
import RegionSelect from './RegionSelect';

type AgentRegistrationProps = {
  allowedRegions: string[];
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
};

export default function AgentRegistrationCard({
  allowedRegions,
  onSuccess,
  onError,
}: AgentRegistrationProps) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [region, setRegion] = useState('');
  const [phone, setPhone] = useState('');
  const [orgId, setOrgId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = email && name && region && !submitting;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await callFn('agentCreateMember', { email, name, region, phone, orgId });
      onSuccess('Member registered successfully');
      setEmail('');
      setName('');
      setRegion('');
      setPhone('');
      setOrgId('');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      onError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-4 mb-6">
      <h3 className="text-lg font-semibold mb-2">Agent Registration</h3>
      <p className="text-sm text-gray-600 mb-4">
        Allowed regions:{' '}
        {allowedRegions.length ? allowedRegions.join(', ') : '—'}
      </p>
      <form
        onSubmit={(e) => {
          void onSubmit(e);
        }}
        className="grid grid-cols-1 md:grid-cols-5 gap-3"
      >
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border rounded px-3 py-2"
          required
        />
        <input
          type="text"
          placeholder="Full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border rounded px-3 py-2"
          required
        />
        <RegionSelect
          value={region}
          onChange={setRegion}
          className="border rounded px-3 py-2"
          options={allowedRegions}
        />
        <input
          type="tel"
          placeholder="Phone (optional)"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="border rounded px-3 py-2"
        />
        <input
          type="text"
          placeholder="Org ID (optional)"
          value={orgId}
          onChange={(e) => setOrgId(e.target.value)}
          className="border rounded px-3 py-2"
        />
        <div className="md:col-span-5 flex justify-end">
          <button
            type="submit"
            disabled={!canSubmit}
            className="bg-indigo-600 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            {submitting ? 'Registering…' : 'Register Member'}
          </button>
        </div>
      </form>
    </div>
  );
}
