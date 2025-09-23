import { useEffect, useMemo, useState } from 'react';

function parseJwtExp(token: string | null | undefined): number | null {
  try {
    if (!token) return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payloadStr = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
    const parsed: unknown = JSON.parse(payloadStr);
    const exp = typeof (parsed as { exp?: unknown }).exp === 'number'
      ? (parsed as { exp: number }).exp
      : Number((parsed as { exp?: unknown }).exp);
    return Number.isFinite(exp) ? exp : null;
  } catch {
    return null;
  }
}

const LS_ENABLED = 'offline_card_enabled';
const LS_TOKEN = 'offline_card_token';
const LS_EXP = 'offline_card_exp';

export function useOfflineCard(liveToken: string | null) {
  const [enabled, setEnabledState] = useState<boolean>(() => {
    try { return localStorage.getItem(LS_ENABLED) === '1'; } catch { return false; }
  });
  const [cachedToken, setCachedToken] = useState<string | null>(() => {
    try { return localStorage.getItem(LS_TOKEN); } catch { return null; }
  });
  const [cachedExp, setCachedExp] = useState<number | null>(() => {
    try { const v = localStorage.getItem(LS_EXP); return v ? Number(v) : null; } catch { return null; }
  });

  // Persist live token when enabled
  useEffect(() => {
    if (!enabled) return;
    if (!liveToken) return;
    const exp = parseJwtExp(liveToken);
    setCachedToken(liveToken);
    setCachedExp(exp);
    try { localStorage.setItem(LS_TOKEN, liveToken); } catch { /* ignore */ }
    try { if (exp) localStorage.setItem(LS_EXP, String(exp)); } catch { /* ignore */ }
  }, [enabled, liveToken]);

  const effectiveToken = useMemo(() => liveToken || cachedToken || null, [liveToken, cachedToken]);
  const expSec = useMemo(() => parseJwtExp(effectiveToken) || cachedExp || null, [effectiveToken, cachedExp]);
  const nowSec = Math.floor(Date.now() / 1000);
  const secondsToExpiry = typeof expSec === 'number' ? (expSec - nowSec) : null;
  const nearExpiry = typeof secondsToExpiry === 'number' ? (secondsToExpiry < 7 * 24 * 3600) : false; // 7 days

  function setEnabled(v: boolean) {
    setEnabledState(v);
    try {
      if (v) localStorage.setItem(LS_ENABLED, '1'); else localStorage.removeItem(LS_ENABLED);
      if (!v) { localStorage.removeItem(LS_TOKEN); localStorage.removeItem(LS_EXP); }
    } catch { /* ignore */ }
    if (!v) { setCachedToken(null); setCachedExp(null); }
  }

  return { enabled, setEnabled, token: effectiveToken, nearExpiry };
}

export default useOfflineCard;
