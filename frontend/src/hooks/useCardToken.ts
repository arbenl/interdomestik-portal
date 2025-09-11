import { useEffect, useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';

export default function useCardToken(uid?: string | null) {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ts, setTs] = useState<number>(0);

  async function fetchToken() {
    if (!uid) { setToken(null); return; }
    setLoading(true); setError(null);
    try {
      const fn = httpsCallable<{ uid?: string }, { token: string }>(functions, 'getCardToken');
      const res = await fn({});
      setToken(res.data?.token || null);
      setTs(Date.now());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!uid) { setToken(null); return; }
      setLoading(true); setError(null);
      try {
        const fn = httpsCallable<{ uid?: string }, { token: string }>(functions, 'getCardToken');
        const res = await fn({});
        if (!cancelled) { setToken(res.data?.token || null); setTs(Date.now()); }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => { cancelled = true; };
  }, [uid]);

  return { token, loading, error, fetchedAt: ts, refresh: fetchToken };
}
