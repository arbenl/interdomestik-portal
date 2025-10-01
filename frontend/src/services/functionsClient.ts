import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';

export async function callFn<TReq, TRes>(
  name: string,
  data: TReq
): Promise<TRes> {
  const fn = httpsCallable<TReq, TRes>(functions, name);
  const res = await fn(data);
  return res.data;
}

export default callFn;
