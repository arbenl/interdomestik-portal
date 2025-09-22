import '@testing-library/jest-dom';
import { vi, afterEach } from 'vitest';

type User = { uid: string; email: string | null } | null;

declare global {
  var __authEmit: (u: User) => void;
  var __fsSeed: (path: string, rows: any[]) => void;
  var __fsSeedDefault: (rows: any[]) => void;
  var __fsThrow: (path: string, err: Error) => void;
  var __fsThrowDefault: (err: Error | null) => void;
  var __fsClear: () => void;
  var __fsDebug: (on: boolean) => void;
  var __setFunctionsResponse: (impl: (name: string, payload: any) => any | Promise<any>) => void;
}

/** ---- auth listener bus we can drive from tests ---- */
const listeners: Array<(u: User) => void> = [];
const add = (cb: (u: User) => void) => {
  listeners.push(cb);
  return () => {
    const i = listeners.indexOf(cb);
    if (i >= 0) listeners.splice(i, 1);
  };
};
global.__authEmit = (u: User) => {
  for (const cb of [...listeners]) cb(u);
};
global.__authReset = () => {
  listeners.splice(0, listeners.length);
};

/** ---- mock modular firebase/auth ---- */
const normalize = (x: unknown) => {
  if (typeof x === 'function') return x as (u: User) => void;
  if (x && typeof (x as any).next === 'function') return (x as any).next as (u: User) => void;
  throw new Error('Auth observer mock requires callback/observer');
};
vi.mock('firebase/auth', async () => {
  const actual = await vi.importActual<any>('firebase/auth');
  const onIdTokenChanged = (_a: any, cbOrObs: any) => add(normalize(cbOrObs));
  const onAuthStateChanged = onIdTokenChanged;
  return {
    ...actual,
    getAuth: () => ({
      app: { options: { projectId: 'demo-test' } },
      currentUser: null,
    }),
    onIdTokenChanged,
    onAuthStateChanged,
  };
});

/** ---- mock useAuth: default + named are the SAME vi.fn ---- */
vi.mock('@/hooks/useAuth', () => {
  const fn = vi.fn(() => ({ user: null, role: 'guest' as const, signIn: vi.fn(), signOut: vi.fn() }));
  const __setUseAuth = (v: any) => (fn as any).mockReturnValue(v);
  return { default: fn, useAuth: fn, __setUseAuth };
});

/** ---- mock functions client: support ALL import shapes ---- */
const __callFn = vi.fn(async () => ({} as any));
const __setFunctionsResponse = (
  impl: (name: string, payload: any) => any | Promise<any>
) => {
  // @ts-expect-error runtime assignment to mock
  __callFn.mockImplementation(impl);
};
globalThis.__setFunctionsResponse = __setFunctionsResponse;

vi.mock('@/services/functionsClient', () => {
  const functionsClient = { call: __callFn };
  return {
    default: __callFn,  // import callFn from ...
    callFn: __callFn,   // import { callFn } from ...
    functionsClient,    // import { functionsClient } from ...
  };
});

/** ---- optional Stripe facades for payments tests ---- */
vi.mock('@stripe/react-stripe-js', () => ({
  Elements: ({ children }: { children: React.ReactNode }) => children,
  useStripe: () => ({ confirmPayment: vi.fn().mockResolvedValue({ paymentIntent: { status: 'succeeded' } }) }),
  useElements: () => ({ getElement: vi.fn() }),
})); // --- Firestore test double: seedable, throwable, debuggable ---

type DocLike = { id: string; data: () => any };
type SnapshotLike = { docs: DocLike[] };

const __fsStore = new Map<string, any[]>();
const __fsErrors = new Map<string, Error>();
let __fsDefault: any[] = [];
let __fsDefaultError: Error | null = null;
let __fsDebug = false;

function toDocs(arr: any[]): DocLike[] {
  return (arr || []).map((obj, i) => ({
    id: obj?.id ?? String(i + 1),
    data: () => obj,
  }));
}
function pathFromSegments(segs: any[]): string {
  return segs.flat().map((s) => (typeof s === 'string' ? s : (s?.__path ?? ''))).join('/');
}
function maybeThrow(path: string) {
  const e = __fsErrors.get(path) ?? __fsDefaultError;
  if (e) throw e;
}
function log(op: string, path: string) {
  if (__fsDebug) console.info(`[FS-MOCK] ${op}: ${path}`);
}

// test helpers (globals)
globalThis.__fsSeed = (path: string, rows: any[]) => { __fsStore.set(path, rows); };
globalThis.__fsSeedDefault = (rows: any[]) => { __fsDefault = rows; };
globalThis.__fsThrow = (path: string, err: Error) => { __fsErrors.set(path, err); };
globalThis.__fsThrowDefault = (err: Error | null) => { __fsDefaultError = err; };
globalThis.__fsClear = () => { __fsStore.clear(); __fsErrors.clear(); __fsDefault = []; __fsDefaultError = null; };
globalThis.__fsDebug = (on: boolean) => { __fsDebug = on; };

vi.mock('firebase/firestore', async (importOriginal) => {
  const actual = await importOriginal<any>();

  const getFirestore = vi.fn(() => ({ __kind: 'firestore' }));
  const collection = vi.fn((dbOrRef: any, ...segments: string[]) => {
    const p = pathFromSegments(segments);
    log('collection', p);
    return { __path: p };
  });
  const doc = vi.fn((dbOrRef: any, ...segments: string[]) => {
    const p = pathFromSegments(segments);
    log('doc', p);
    return { __path: p };
  });

  const query = vi.fn((ref: any) => ref);
  const where = vi.fn((_f: string, _op: string, _v: any) => (x: any) => x);
  const orderBy = vi.fn((_f: string) => (x: any) => x);
  const limit = vi.fn((_n: number) => (x: any) => x);

  const getDocs = vi.fn(async (refOrQuery: any): Promise<SnapshotLike> => {
    const path = refOrQuery?.__path ?? '';
    log('getDocs', path);
    maybeThrow(path);
    const rows = __fsStore.get(path) ?? __fsDefault;
    return { docs: toDocs(rows) };
  });

  const getDoc = vi.fn(async (ref: any) => {
    const path = ref?.__path ?? '';
    log('getDoc', path);
    maybeThrow(path);
    const rows = __fsStore.get(path) ?? __fsDefault;
    const first = (rows && rows[0]) || undefined;
    return { exists: () => !!first, id: first?.id ?? '1', data: () => first };
  });

  const onSnapshot = vi.fn((refOrQuery: any, cb: (snap: SnapshotLike) => void) => {
    const path = refOrQuery?.__path ?? '';
    log('onSnapshot', path);
    maybeThrow(path);
    const rows = __fsStore.get(path) ?? __fsDefault;
    cb({ docs: toDocs(rows) });
    return () => {};
  });

  const setDoc = vi.fn(async (ref: any, data: any) => {
    const path = ref?.__path ?? '';
    const rows = __fsStore.get(path) ?? [];
    const id = data?.id ?? String(rows.length + 1);
    const next = rows.filter((r: any) => (r.id ?? '') !== id).concat([{ ...data, id }]);
    __fsStore.set(path, next);
  });
  const updateDoc = vi.fn(async (ref: any, data: any) => setDoc(ref, data));
  const addDoc = vi.fn(async (colRef: any, data: any) => setDoc({ __path: colRef?.__path ?? '' }, data));

  return {
    ...actual,
    getFirestore, collection, doc, query, where, orderBy, limit,
    getDocs, getDoc, onSnapshot, setDoc, updateDoc, addDoc,
  };
});

afterEach(() => {
  globalThis.__fsClear?.();
});