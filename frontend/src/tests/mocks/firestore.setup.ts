import { vi } from 'vitest';
import type { DocumentReference, Query, QuerySnapshot, DocumentSnapshot } from 'firebase/firestore';

type SnapshotEmitter = (next: (snap: Partial<QuerySnapshot>) => void, error: (err: Error) => void) => void;
const emitters = new Map<string, SnapshotEmitter>();

export function setFirestoreSnapshotEmitter(key: string, emitter: SnapshotEmitter) {
  emitters.set(key, emitter);
}
interface _HasKey {
  path?: string;
  __key?: string;
}
export function keyFor(refOrQuery: DocumentReference | Query): string {
  const obj = refOrQuery as _HasKey;
  return obj?.path ?? obj?.__key ?? String(refOrQuery);
}

vi.mock('firebase/firestore', async () => {
  const actual = await vi.importActual<typeof import('firebase/firestore')>('firebase/firestore');

  function collection(_db: unknown, ...segments: string[]): Query {
    const path = segments.join('/');
    return { __type: 'collection', path, __key: path } as unknown as Query;
  }
  function doc(_dbOrCol: unknown, ...segments: string[]): DocumentReference {
    const path = segments.join('/');
    return { __type: 'doc', path, __key: path } as unknown as DocumentReference;
  }
  function query(ref: Query): Query {
    const k = keyFor(ref);
    return { __type: 'query', path: `q:${k}`, __key: `q:${k}` } as unknown as Query;
  }
  function onSnapshot(
    refOrQuery: DocumentReference | Query,
    onNext: (snap: QuerySnapshot | DocumentSnapshot) => void,
    onError: (err: Error) => void,
  ): () => void {
    queueMicrotask(() => {
      const k = keyFor(refOrQuery);
      const emit = emitters.get(k);
      if (emit) {
        const emitterCallback = (snap: Partial<QuerySnapshot>) => onNext?.(snap as QuerySnapshot);
        const errorCallback = (err: Error) => onError?.(err);
        emit(emitterCallback, errorCallback);
      } else {
        onNext?.({ docs: [], size: 0, empty: true } as unknown as QuerySnapshot);
      }
    });
    return () => {};
  }

  function getDocs(query: Query): Promise<QuerySnapshot> {
    const k = keyFor(query);
    const emit = emitters.get(k);
    if (emit) {
      let snapshot: Partial<QuerySnapshot> = {};
      emit(
        (snap) => (snapshot = snap),
        () => {},
      );
      return Promise.resolve(snapshot as QuerySnapshot);
    }
    return Promise.resolve({ docs: [], size: 0, empty: true } as unknown as QuerySnapshot);
  }

  return {
    ...actual,
    collection: vi.fn(collection),
    doc: vi.fn(doc),
    query: vi.fn(query),
    onSnapshot: vi.fn(onSnapshot),
    getDocs: vi.fn(getDocs),
    addDoc: vi.fn(async () => ({}) as DocumentReference),
    setDoc: vi.fn(async () => {}),
    updateDoc: vi.fn(async () => {}),
  };
});