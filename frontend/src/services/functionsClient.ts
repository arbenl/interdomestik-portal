import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';

export type FunctionsClient = (name: string, payload?: unknown) => Promise<unknown>;

async function callFn<TRes, TReq>(name: string, payload: TReq): Promise<TRes> {
  const callable = httpsCallable(functions, name);
  const result = await callable(payload);
  return result.data as TRes;
}

export default callFn;
