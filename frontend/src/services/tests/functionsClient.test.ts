import { describe, it, expect, vi } from 'vitest';
import { callFn } from '../functionsClient';

// The mock is defined in setupTests.ts and available globally.
// We can access the mock implementation via the global __setFunctionsResponse helper.

describe('functionsClient.callFn', () => {
  it('calls the mock function with name and returns data', async () => {
    const mockImpl = vi.fn().mockResolvedValue({ ok: true, from: 'mock' });
    global.__setFunctionsResponse(mockImpl);

    const out = await callFn('foo', { a: 1 });

    expect(mockImpl).toHaveBeenCalledWith('foo', { a: 1 });
    expect(out).toEqual({ ok: true, from: 'mock' });
  });
});