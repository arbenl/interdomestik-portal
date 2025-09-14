import { httpsCallable } from 'firebase/functions';
import type { Functions } from 'firebase/functions';
import { functions } from '../firebase';

export const callFn = <I, O>(name: string, fns: Functions = functions) =>
  httpsCallable<I, O>(fns, name);