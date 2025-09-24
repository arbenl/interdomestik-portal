import { useState, useCallback } from 'react';
import { safeErrorMessage } from '../../../utils/errors';
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

async function seedDatabase() {
  await callEmulator('seedDatabase');
}

async function clearDatabase() {
  await callEmulator('clearDatabase');
}

/**
 * Hook for interacting with the Firebase emulator.
 * @returns {object} The emulator state and functions.
 * @property {boolean} loading - Whether an emulator operation is in progress.
 * @property {string | null} error - Any error message from the last operation.
 * @property {() => Promise<void>} seedEmulator - A function to seed the emulator with test data.
 * @property {() => Promise<void>} clearEmulator - A function to clear the emulator data.
 */
export function useEmulator() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const seedEmulator = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await seedDatabase();
    } catch (e) {
      setError(safeErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  const clearEmulator = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await clearDatabase();
    } catch (e) {
      setError(safeErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    seedEmulator,
    clearEmulator,
  };
}
