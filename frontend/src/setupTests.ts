import '@testing-library/jest-dom';
import type { ReactNode } from 'react';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

type User = { uid: string; email?: string; displayName?: string } | null;

type TestGlobal = typeof globalThis & {
  __authEmit?: (u: User) => void;
  __authReset?: () => void;
  __fsSeed?: (path: string, rows: any[]) => void;
  __fsSeedDefault?: (rows: any[]) => void;
  __fsThrow?: (error?: unknown) => void;
  __fsReset?: () => void;
  __setFunctionsResponse?: (
    impl: (name: string, payload: any) => any | Promise<any>
  ) => void;
  __resetFunctions?: () => void;
  __stripeReset?: () => void;
};

declare global {
  var __authEmit: (_user: User) => void;
  var __authReset: () => void;
  var __fsSeed: (_path: string, _rows: any[]) => void;
  var __fsSeedDefault: (_rows: any[]) => void;
  var __fsThrow: (_error?: unknown) => void;
  var __fsReset: () => void;
  var __setFunctionsResponse: (
    _impl: (name: string, payload: any) => any | Promise<any>
  ) => void;
  var __resetFunctions: () => void;
  var __stripeReset: () => void;
}

const testGlobal = globalThis as TestGlobal;

/** ------------------------------------------------------------------------
 * firebase/auth — maintain a single auth instance across renders.
 * ------------------------------------------------------------------------ */
vi.mock('firebase/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('firebase/auth')>();

  const AUTH_SINGLETON: {
    app: { options: { projectId: string } };
    currentUser: User;
  } = {
    app: { options: { projectId: 'interdomestik-dev' } },
    currentUser: null as User,
  };

  let currentUser: User = null;
  const listeners = new Set<(u: User) => void>();

  const normalize = (callbackOrObserver: unknown): ((u: User) => void) => {
    if (typeof callbackOrObserver === 'function') {
      return callbackOrObserver as (u: User) => void;
    }
    const maybeObserver = callbackOrObserver as
      | { next?: (u: User) => void }
      | undefined;
    if (maybeObserver?.next) return maybeObserver.next.bind(maybeObserver);
    throw new Error(
      'Auth observer mock requires a callback or observer with next()'
    );
  };

  const subscribe = (_auth: unknown, callbackOrObserver: unknown) => {
    const cb = normalize(callbackOrObserver);
    // mimic async emission performed by Firebase SDK
    const timer = setTimeout(() => cb(currentUser), 0);
    listeners.add(cb);
    return () => {
      clearTimeout(timer);
      listeners.delete(cb);
    };
  };

  testGlobal.__authEmit = (user: User) => {
    currentUser = user ?? null;
    AUTH_SINGLETON.currentUser = currentUser;
    for (const listener of [...listeners]) listener(currentUser);
  };

  testGlobal.__authReset = () => {
    currentUser = null;
    AUTH_SINGLETON.currentUser = null;
    listeners.clear();
  };

  return {
    ...actual,
    getAuth: () => AUTH_SINGLETON,
    onIdTokenChanged: subscribe,
    onAuthStateChanged: subscribe,
  };
});

testGlobal.__authEmit ??= () => {};
testGlobal.__authReset ??= () => {};

/** ------------------------------------------------------------------------
 * firebase/firestore — in-memory store with per-test reset helpers.
 * ------------------------------------------------------------------------ */

type DocLike = { id: string; data: () => any };
type SnapshotLike = { docs: DocLike[] };

const fsStore = new Map<string, any[]>();
let defaultRows: any[] = [];
let fsError: unknown = null;

const toDocs = (rows: any[] = []): DocLike[] =>
  rows.map((row, index) => ({
    id: row?.id ?? String(index + 1),
    data: () => row,
  }));

const pathFromSegments = (segments: any[]): string =>
  segments
    .flat()
    .map((segment) =>
      typeof segment === 'string' ? segment : (segment?.__path ?? '')
    )
    .filter(Boolean)
    .join('/');

const ensureNoFsError = () => {
  if (fsError) throw fsError;
};

testGlobal.__fsSeed = (path: string, rows: any[]) => {
  fsStore.set(path, rows);
};

testGlobal.__fsSeedDefault = (rows: any[]) => {
  defaultRows = rows;
};

testGlobal.__fsThrow = (error?: unknown) => {
  fsError = error ?? new Error('Firestore error');
};

testGlobal.__fsReset = () => {
  fsStore.clear();
  defaultRows = [];
  fsError = null;
};

vi.mock('firebase/firestore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('firebase/firestore')>();

  const getFirestore = vi.fn(() => ({ __kind: 'firestore' }));
  const collection = vi.fn((dbOrRef: any, ...segments: string[]) => ({
    __path: pathFromSegments(segments),
  }));
  const doc = vi.fn((dbOrRef: any, ...segments: string[]) => ({
    __path: pathFromSegments(segments),
  }));
  const query = vi.fn((ref: any) => ref);
  const where = vi.fn(
    (_field: string, _op: string, _value: any) => (x: any) => x
  );
  const orderBy = vi.fn(
    (_field: string, _direction?: 'asc' | 'desc') => (x: any) => x
  );
  const limit = vi.fn((_n: number) => (x: any) => x);

  const getDocs = vi.fn(async (refOrQuery: any): Promise<SnapshotLike> => {
    ensureNoFsError();
    const path = refOrQuery?.__path ?? '';
    const rows = fsStore.get(path) ?? defaultRows;
    return { docs: toDocs(rows) };
  });

  const getDoc = vi.fn(async (ref: any) => {
    ensureNoFsError();
    const path = ref?.__path ?? '';
    const rows = fsStore.get(path) ?? defaultRows;
    const first = rows?.[0];
    return { exists: () => !!first, id: first?.id ?? '1', data: () => first };
  });

  const onSnapshot = vi.fn(
    (refOrQuery: any, cb: (snapshot: SnapshotLike) => void) => {
      ensureNoFsError();
      const path = refOrQuery?.__path ?? '';
      const rows = fsStore.get(path) ?? defaultRows;
      cb({ docs: toDocs(rows) });
      return () => {};
    }
  );

  const setDoc = vi.fn(async (ref: any, data: any) => {
    ensureNoFsError();
    const path = ref?.__path ?? '';
    const rows = fsStore.get(path) ?? [];
    const id = data?.id ?? String(rows.length + 1);
    const next = rows
      .filter((row: any) => (row.id ?? '') !== id)
      .concat([{ ...data, id }]);
    fsStore.set(path, next);
  });

  const updateDoc = vi.fn(async (ref: any, data: any) => setDoc(ref, data));
  const addDoc = vi.fn(async (colRef: any, data: any) =>
    setDoc({ __path: colRef?.__path ?? '' }, data)
  );

  return {
    ...actual,
    getFirestore,
    collection,
    doc,
    query,
    where,
    orderBy,
    limit,
    getDocs,
    getDoc,
    onSnapshot,
    setDoc,
    updateDoc,
    addDoc,
  };
});

testGlobal.__fsSeed ??= () => {};
testGlobal.__fsSeedDefault ??= () => {};
testGlobal.__fsThrow ??= () => {};
testGlobal.__fsReset ??= () => {};

/** ------------------------------------------------------------------------
 * Firebase Functions client — controllable default export & helpers.
 * ------------------------------------------------------------------------ */
const callFnMock = vi.fn<(name: string, payload: any) => Promise<any>>();

const applyFunctionsImpl = (
  impl: (name: string, payload: any) => any | Promise<any>
) => {
  callFnMock.mockImplementation(async (name: string, payload: any) =>
    impl(name, payload)
  );
};

const resetFunctions = () => {
  applyFunctionsImpl(async () => ({}));
};

resetFunctions();

testGlobal.__setFunctionsResponse = (impl) => applyFunctionsImpl(impl);
testGlobal.__resetFunctions = resetFunctions;

vi.mock('@/services/functionsClient', () => {
  const functionsClient = { call: callFnMock };
  return {
    __esModule: true,
    default: callFnMock,
    callFn: callFnMock,
    functionsClient,
  };
});

/** ------------------------------------------------------------------------
 * Stripe mocks — keep confirmation stub predictable across tests.
 * ------------------------------------------------------------------------ */
const stripeConfirmPayment = vi.fn();
const stripeElementsGetElement = vi.fn();

const resetStripe = () => {
  stripeConfirmPayment.mockReset();
  stripeConfirmPayment.mockResolvedValue({
    paymentIntent: { status: 'succeeded' },
  });
  stripeElementsGetElement.mockReset();
};

resetStripe();

testGlobal.__stripeReset = resetStripe;

vi.mock('@stripe/react-stripe-js', () => ({
  __esModule: true,
  Elements: ({ children }: { children: ReactNode }) => children,
  useStripe: () => ({ confirmPayment: stripeConfirmPayment }),
  useElements: () => ({ getElement: stripeElementsGetElement }),
}));

/** ------------------------------------------------------------------------
 * Firebase app module — avoid env lookups during tests.
 * ------------------------------------------------------------------------ */
vi.mock('@/lib/firebase', () => {
  const auth = {
    app: { options: { projectId: 'interdomestik-dev' } },
    currentUser: null,
  };
  const firestore = {};
  const functions = {};
  const noop = () => {};
  const projectId = 'interdomestik-dev';
  const emulatorProjectId = 'interdomestik-dev';
  const usingEmulators = false;
  return {
    __esModule: true,
    auth,
    firestore,
    functions,
    projectId,
    emulatorProjectId,
    usingEmulators,
    getAuth: () => auth,
    getFirestore: () => firestore,
    getFunctions: () => functions,
    connectAuthEmulator: noop,
    connectFirestoreEmulator: noop,
    connectFunctionsEmulator: noop,
  };
});

/** ------------------------------------------------------------------------
 * Global afterEach cleanup — reset mocks/state between tests.
 * ------------------------------------------------------------------------ */
afterEach(() => {
  testGlobal.__authReset?.();
  testGlobal.__fsReset?.();
  testGlobal.__resetFunctions?.();
  testGlobal.__stripeReset?.();

  vi.clearAllMocks();
  vi.resetAllMocks();
  vi.resetModules();
  vi.unstubAllEnvs?.();
  vi.unstubAllGlobals?.();
  cleanup();
});
