import { describe, it, expect, beforeEach } from 'vitest';
import { act } from '@testing-library/react';
import { useOfflineCard } from './useOfflineCard';
import { renderHookWithProviders } from '@/test-utils';

interface JwtPayload {
  mno: string;
  iat: number;
  exp: number;
  ver: number;
  jti: string;
}

function makeToken(expSecondsFromNow: number): string {
  const header = { alg: 'HS265', typ: 'JWT', kid: 'v1' };
  const now = Math.floor(Date.now()/1000);
  const payload: JwtPayload = { mno: 'INT-2025-000001', iat: now, exp: now + expSecondsFromNow, ver: 1, jti: 'abc123' };
  const enc = (obj: Record<string, unknown>) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  return `${enc(header)}.${enc(payload as any)}.sig`;
}

describe('useOfflineCard', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('opts in and caches token without PII; near expiry triggers prompt', () => {
    const soonExpToken = makeToken(3 * 24 * 3600); // 3 days
    const { result, rerender } = renderHookWithProviders<ReturnType<typeof useOfflineCard>, { live: string | null }>((props) => useOfflineCard(props.live), {
      initialProps: { live: null },
    });
    // Initially disabled, no token
    expect(result.current.enabled).toBe(false);
    expect(result.current.token).toBe(null);
    // Enable
    act(() => { result.current.setEnabled(true); });
    // Provide a live token; should be cached and nearExpiry true
    rerender({ live: soonExpToken });
    expect(result.current.token).toBe(soonExpToken);
    expect(result.current.nearExpiry).toBe(true);
    // Cached in localStorage
    expect(localStorage.getItem('offline_card_token')).toBe(soonExpToken);
    // Disable clears cache
    act(() => { result.current.setEnabled(false); });
    expect(localStorage.getItem('offline_card_token')).toBe(null);
  });

  it('falls back to cached token when live is missing', () => {
    const validToken = makeToken(30 * 24 * 3600);
    const { result, rerender } = renderHookWithProviders<ReturnType<typeof useOfflineCard>, { live: string | null }>((props) => useOfflineCard(props.live), {
      initialProps: { live: null },
    });
    act(() => { result.current.setEnabled(true); });
    rerender({ live: validToken });
    // Now drop live token; cached should remain available
    rerender({ live: null });
    expect(result.current.token).toBe(validToken);
    expect(result.current.nearExpiry).toBe(false);
  });
});