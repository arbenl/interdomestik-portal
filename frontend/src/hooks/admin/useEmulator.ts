import { useState } from 'react';
import { emulatorProjectId } from '@/lib/firebase';

const EMU_BASE = `http://127.0.0.1:5001/${emulatorProjectId}/europe-west1`;

async function callEmulator(path: string, init: RequestInit = {}) {
  const res = await fetch(`${EMU_BASE}/${path}`, {
    headers: {
      'x-emulator-admin': 'true',
      ...(init.headers ?? {}),
    },
    ...init,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`${path} failed: ${res.status}${body ? ` – ${body}` : ''}`);
  }
  return res;
}

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
      await callEmulator('seedDatabase');
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
      await callEmulator('clearDatabase');
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
