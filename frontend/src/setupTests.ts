import '@testing-library/jest-dom';
import { vi } from 'vitest';

/** ---- auth listener bus we can drive from tests ---- */
type User = { uid: string; email?: string } | null;
const listeners: Array<(u: User) => void> = [];
const add = (cb: (u: User) => void) => {
  listeners.push(cb);
  return () => {
    const i = listeners.indexOf(cb);
    if (i >= 0) listeners.splice(i, 1);
  };
};

type TestGlobal = typeof globalThis & {
  __authEmit?: (u: User) => void;
  __authReset?: () => void;
  __setFunctionsResponse?: (impl: (name: string, payload: any) => any | Promise<any>) => void;
  __fsSeed?: (path: string, rows: any[]) => void;
  __fsSeedDefault?: (rows: any[]) => void;
  __fsClear?: () => void;
};

const testGlobal = globalThis as TestGlobal;

declare global {
  var __authEmit: (u: User) => void;
  var __authReset: () => void;
  var __setFunctionsResponse: (impl: (name: string, payload: any) => any | Promise<any>) => void;
  var __fsSeed: (path: string, rows: any[]) => void;
  var __fsSeedDefault: (rows: any[]) => void;
  var __fsClear: () => void;
}

testGlobal.__authEmit = (u: User) => { for (const cb of [...listeners]) cb(u); };
testGlobal.__authReset = () => { listeners.splice(0, listeners.length); };

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
  const authStub = {
    app: { options: { projectId: 'demo-interdomestik' } },
    currentUser: null,
    onAuthStateChanged,
  };
  return { ...actual, getAuth: () => authStub, onIdTokenChanged, onAuthStateChanged };
});

/** ---- mock useAuth: default + named are the SAME vi.fn ---- */
vi.mock('@/hooks/useAuth', () => {
  const fn = vi.fn(() => ({ user: null, role: 'guest' as const, signIn: vi.fn(), signOut: vi.fn() }));
  const __setUseAuth = (v: any) => (fn as any).mockReturnValue(v);
  return { default: fn, useAuth: fn, __setUseAuth };
});

/** ---- mock functions client: support ALL import shapes ---- */
const __callFn = vi.fn(async () => ({} as any));
export const __setFunctionsResponse = (
  impl: (name: string, payload: any) => any | Promise<any>
) => {
  __callFn.mockImplementation(impl as any);
};
// expose setter so tests can configure the mock without imports
testGlobal.__setFunctionsResponse = __setFunctionsResponse;
vi.mock('@/services/functionsClient', () => {
  const functionsClient = { call: __callFn };
  return {
    default: __callFn,  // import callFn from ...
    callFn: __callFn,   // import { callFn } from ...
    functionsClient,    // import { functionsClient } from ...
    __setFunctionsResponse
  };
});

/** ---- optional Stripe facades for payments tests ---- */
vi.mock('@stripe/react-stripe-js', () => ({
  Elements: ({ children }: { children: React.ReactNode }) => children,
  useStripe: () => ({ confirmPayment: vi.fn().mockResolvedValue({ paymentIntent: { status: 'succeeded' } }) }),
  useElements: () => ({ getElement: vi.fn() }),
})); // --- firestore mock: deterministic, seedable --- //

type DocLike = { id: string; data: () => any };
type SnapshotLike = { docs: DocLike[] };

const __fsStore = new Map<string, any[]>();    // path -> array of plain objects
let __fsDefault: any[] = [];                   // fallback when path not seeded

function toDocs(arr: any[]): DocLike[] {
  return (arr || []).map((obj, i) => ({
    id: obj?.id ?? String(i + 1),
    data: () => obj,
  }));
}

function pathFromSegments(segs: any[]): string {
  // segments can be strings or refs; stringify best-effort
  return segs.flat().map((s) => (typeof s === 'string' ? s : (s?.__path ?? '') )).join('/');
}

testGlobal.__fsSeed = (path: string, rows: any[]) => { __fsStore.set(path, rows); };
testGlobal.__fsSeedDefault = (rows: any[]) => { __fsDefault = rows; };
testGlobal.__fsClear = () => { __fsStore.clear(); __fsDefault = []; };


vi.mock('firebase/firestore', async (importOriginal) => {
  const actual = await importOriginal<any>();

  const getFirestore = vi.fn(() => ({ __kind: 'firestore' }));
  const collection = vi.fn((dbOrRef: any, ...segments: string[]) => ({ __path: pathFromSegments(segments) }));
  const doc = vi.fn((dbOrRef: any, ...segments: string[]) => ({ __path: pathFromSegments(segments) }));

  // Query builders just carry-through the ref; we don’t emulate filters here.
  const query = vi.fn((ref: any) => ref);
  const where = vi.fn((_f: string, _op: string, _v: any) => (x: any) => x);
  const orderBy = vi.fn((_f: string, _dir?: 'asc' | 'desc') => (x: any) => x);
  const limit = vi.fn((_n: number) => (x: any) => x);

  const getDocs = vi.fn(async (refOrQuery: any): Promise<SnapshotLike> => {
    const path = refOrQuery?.__path ?? '';
    const rows = __fsStore.get(path) ?? __fsDefault;
    return { docs: toDocs(rows) };
  });

  const getDoc = vi.fn(async (ref: any) => {
    const path = ref?.__path ?? '';
    const rows = __fsStore.get(path) ?? __fsDefault;
    const first = (rows && rows[0]) || undefined;
    return { exists: () => !!first, id: first?.id ?? '1', data: () => first };
  });

  const onSnapshot = vi.fn((refOrQuery: any, cb: (snap: SnapshotLike) => void) => {
    const path = refOrQuery?.__path ?? '';
    const rows = __fsStore.get(path) ?? __fsDefault;
    cb({ docs: toDocs(rows) });
    return () => { /* unsubscribe noop */ };
  });

  // write ops: mutate store (good enough for tests that “start export”, etc.)
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
    ...actual, // keeps types/constants if something imports them
    getFirestore, collection, doc, query, where, orderBy, limit,
    getDocs, getDoc, onSnapshot, setDoc, updateDoc, addDoc,
  };
});

afterEach(() => {
  vi.clearAllMocks?.();
  testGlobal.__fsClear?.();
  testGlobal.__authReset?.();
});
