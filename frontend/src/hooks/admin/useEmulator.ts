import { useState } from 'react';

const EMU_BASE = 'http://127.0.0.1:5001/demo-interdomestik/europe-west1';

export function useEmulator() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSuccess = (message: string) => {
    setSuccess(message);
    setTimeout(() => setSuccess(null), 5000);
  };

  const seedEmulator = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${EMU_BASE}/seedDatabase`);
      if (!res.ok) throw new Error(`Seed failed: ${res.status}`);
      handleSuccess('Emulator seeded with test users');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed seeding emulator';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const clearEmulator = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${EMU_BASE}/clearDatabase`);
      if (!res.ok) throw new Error(`Clear failed: ${res.status}`);
      handleSuccess('Emulator database cleared');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed clearing emulator';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    success,
    seedEmulator,
    clearEmulator,
  };
}
