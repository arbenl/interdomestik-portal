import React, { useEffect, useState } from 'react';

declare global {
  interface Window { grecaptcha?: any }
}

async function maybeGetCaptchaToken(): Promise<string | undefined> {
  try {
    if (typeof window === 'undefined') return undefined;
    const siteKey = (import.meta as any)?.env?.VITE_RECAPTCHA_SITE_KEY || (import.meta as any)?.env?.VITE_APPCHECK_SITE_KEY;
    if (!siteKey) return undefined;
    // If grecaptcha not present, attempt to load script once
    if (!window.grecaptcha) {
      await new Promise<void>((resolve) => {
        const s = document.createElement('script');
        s.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(siteKey)}`;
        s.async = true;
        s.onload = () => resolve();
        s.onerror = () => resolve();
        document.head.appendChild(s);
      });
    }
    if (!window.grecaptcha?.execute) return undefined;
    return await window.grecaptcha.execute(siteKey, { action: 'verify' });
  } catch {
    return undefined;
  }
}

const Verify: React.FC = () => {
  const [memberNo, setMemberNo] = useState('');
  const [result, setResult] = useState<{ ok?: boolean; valid?: boolean; name?: string; memberNo?: string; region?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runVerify(params: { memberNo?: string; token?: string }) {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const qs = new URLSearchParams();
      if (params.token) qs.set('token', params.token);
      if (params.memberNo) qs.set('memberNo', params.memberNo);
      const captcha = await maybeGetCaptchaToken();
      const response = await fetch(`/verifyMembership?${qs.toString()}`, {
        headers: captcha ? { 'x-recaptcha-token': captcha } : undefined,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await runVerify({ memberNo });
  };

  // Auto-run if token or memberNo in query string
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const t = url.searchParams.get('token') || undefined;
      const m = url.searchParams.get('memberNo') || undefined;
      if (t || m) {
        if (m) setMemberNo(m);
        runVerify({ token: t, memberNo: m });
      }
    } catch {
      // ignore malformed URLs in non-browser contexts
    }
  }, []);

  return (
    <div className="max-w-md mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Verify Membership</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          value={memberNo}
          onChange={(e) => setMemberNo(e.target.value)}
          placeholder="Enter Member No (e.g., INT-2025-123456)"
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
        <button 
          type="submit" 
          disabled={loading}
          className="w-full py-2 px-4 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-400"
        >
          {loading ? 'Verifying...' : 'Verify'}
        </button>
      </form>

      {error && <p className="mt-4 text-red-500">Error: {error}</p>}

      {result && (
        <div className="mt-6 p-4 border rounded-lg shadow-md">
          <h2 className="text-lg font-bold mb-2">Verification Result</h2>
          {result.valid ? (
            <div>
              <p className="text-green-600 font-semibold">Membership is Active</p>
              <p><strong>Name:</strong> {result.name}</p>
              <p><strong>Member No:</strong> {result.memberNo}</p>
              <p><strong>Region:</strong> {result.region}</p>
            </div>
          ) : (
            <p className="text-red-600 font-semibold">Membership is not valid or not found.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default Verify;
