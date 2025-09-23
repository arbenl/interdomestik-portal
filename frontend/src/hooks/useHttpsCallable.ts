import { useState, useCallback } from 'react';
import { httpsCallable, HttpsCallableResult } from 'firebase/functions';
import { functions } from '@/lib/firebase';

interface HttpsError extends Error {
  name: string;
  code: string;
  details?: unknown;
}

interface UseHttpsCallableResult<RequestData, ResponseData> {
  data: ResponseData | null;
  loading: boolean;
  error: HttpsError | null;
  callFunction: (data: RequestData) => Promise<void>;
  reset: () => void;
}

export function useHttpsCallable<RequestData = unknown, ResponseData = unknown>(
  functionName: string
): UseHttpsCallableResult<RequestData, ResponseData> {
  const [data, setData] = useState<ResponseData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<HttpsError | null>(null);

  const callFunction = useCallback(
    async (requestData: RequestData) => {
      setLoading(true);
      setError(null);
      setData(null);

      try {
        const callable = httpsCallable<RequestData, ResponseData>(functions, functionName);
        const result: HttpsCallableResult<ResponseData> = await callable(requestData);
        setData(result.data);
      } catch (err: unknown) {
        const error = err as HttpsError;
        setError({
          name: error.name || 'HttpsError',
          code: error.code || 'unknown',
          message: error.message || 'An unknown error occurred.',
          details: error.details,
        });
      } finally {
        setLoading(false);
      }
    },
    [functionName]
  );

  const reset = useCallback(() => {
    setData(null);
    setLoading(false);
    setError(null);
  }, []);

  return { data, loading, error, callFunction, reset };
}