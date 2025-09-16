import { describe, it, expect, vi, beforeEach } from 'vitest';
import { callFn } from '@/services/functionsClient';
import * as firebaseFunctions from 'firebase/functions';

// Mock the entire 'firebase/functions' module
vi.mock('firebase/functions', async (importOriginal) => {
  const actual = await importOriginal<typeof firebaseFunctions>();
  return {
    ...actual,
    // Mock getFunctions to return a consistent object
    getFunctions: vi.fn(() => ({})),
    // Mock httpsCallable itself
    httpsCallable: vi.fn((_functionsInstance, functionName) => {
      // This inner mock function simulates the actual callable function call
      const mockCallableFunction = vi.fn(async () => {
        if (functionName === 'foo') {
          // Simulate a successful response for 'foo'
          return { data: { ok: true } };
        }
        // Handle other callable functions or error cases if needed
        throw new Error(`Unknown callable function: ${functionName}`);
      });
      return mockCallableFunction;
    }),
  };
});

// Get the mocked functions after the mock has been defined
const { httpsCallable } = vi.mocked(firebaseFunctions);

describe('functionsClient.callFn', () => {
  beforeEach(() => {
    // Clear mocks before each test to ensure isolation
    vi.clearAllMocks();
  });

  it('calls httpsCallable with name and returns data', async () => {
    const out = await callFn('foo', { a: 1 });
    expect(httpsCallable).toHaveBeenCalledWith(expect.any(Object), 'foo');
    const mockCallable = httpsCallable.mock.results[0].value;
    expect(mockCallable).toHaveBeenCalledWith({ a: 1 });
    expect(out).toEqual({ ok: true });
  });
});