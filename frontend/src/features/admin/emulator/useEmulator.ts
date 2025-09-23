import { useState, useCallback } from 'react';
import { safeErrorMessage } from '../../../utils/errors';

const PROJECT_ID = import.meta.env.VITE_FIREBASE_EMULATOR_PROJECT_ID
  || import.meta.env.VITE_FIREBASE_PROJECT_ID
  || 'demo-interdomestik';
const EMU_BASE = `http://127.0.0.1:5001/${PROJECT_ID}/europe-west1`;

async function seedDatabase() {
  const res = await fetch(`${EMU_BASE}/seedDatabase`);
  if (!res.ok) {
    throw new Error(`Seed failed: ${res.status}`);
  }
}

async function clearDatabase() {
  const res = await fetch(`${EMU_BASE}/clearDatabase`);
  if (!res.ok) {
    throw new Error(`Clear failed: ${res.status}`);
  }
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
