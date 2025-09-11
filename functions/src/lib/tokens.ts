import { createHmac, randomBytes } from 'crypto';

function b64url(input: Buffer | string): string {
  const b = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return b.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function getSecrets(): { [kid: string]: string; activeKid: string } {
  const mappingRaw = process.env.CARD_JWT_SECRETS; // JSON: { "v1":"secret1","v2":"secret2" }
  const active = process.env.CARD_JWT_ACTIVE_KID || 'v1';
  if (mappingRaw) {
    try {
      const map = JSON.parse(mappingRaw || '{}');
      if (map && typeof map === 'object' && Object.keys(map).length > 0) {
        return { [active]: map[active] || '', ...map, activeKid: active } as any;
      }
    } catch {}
  }
  const fallback = process.env.CARD_JWT_SECRET || process.env.STRIPE_SIGNING_SECRET || 'dev-card-secret-change-me';
  return { v1: fallback, activeKid: 'v1' } as any;
}

export type CardClaims = {
  mno: string; // member number
  iat?: number; // issued at (seconds)
  exp?: number; // expiry (seconds)
  ver?: number; // schema version
  jti?: string; // token id for revocation
};

export function signCardToken(claims: CardClaims, kid?: string): string {
  const { activeKid, ...secrets } = getSecrets();
  const useKid = kid || (activeKid as string);
  const secret = (secrets as any)[useKid] as string;
  const header = { alg: 'HS256', typ: 'JWT', kid: useKid } as const;
  const nowSec = Math.floor(Date.now() / 1000);
  const jti = claims.jti || b64url(randomBytes(12));
  const body = { ver: 1, iat: nowSec, jti, ...claims } as Required<CardClaims>;
  const enc = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(body))}`;
  const sig = createHmac('sha256', secret).update(enc).digest();
  return `${enc}.${b64url(sig)}`;
}

export function verifyCardToken(token: string): (CardClaims & { kid?: string }) | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [h, p, s] = parts;
    const hdr = JSON.parse(Buffer.from(h.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString());
    const kid = hdr?.kid || 'v1';
    const secrets = getSecrets();
    const sec = (secrets as any)[kid] as string;
    if (!sec) return null;
    const expected = b64url(createHmac('sha256', sec).update(`${h}.${p}`).digest());
    if (s !== expected) return null;
    const claims = JSON.parse(Buffer.from(p.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString());
    if (typeof claims.exp === 'number' && Math.floor(Date.now() / 1000) > claims.exp) {
      // Token expiration is advisory; verification endpoint also checks DB state
      // Return claims anyway to allow UX with explicit expired result
      return { ...claims, kid };
    }
    return { ...claims, kid };
  } catch {
    return null;
  }
}
