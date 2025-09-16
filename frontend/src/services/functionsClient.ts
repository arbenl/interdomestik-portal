import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';

export async function callFn<TInput = unknown, TOutput = unknown>(name: string, data?: TInput): Promise<TOutput> {
  const callable = httpsCallable<TInput, TOutput>(functions, name);
  const res = await callable(data as TInput);
  return res.data as TOutput;
}
