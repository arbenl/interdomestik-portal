import type {
  FirestoreDataConverter,
  QueryDocumentSnapshot,
  DocumentData,
} from 'firebase/firestore';
import type {
  Profile,
  Membership,
  Invoice,
  EventItem,
  MonthlyReport,
  AuditLog,
  Organization,
  Coupon,
} from '@/types';

// Generic safe wrapper: only apply converter when the ref supports it (avoids breaking tests/mocks)
type WithConv<T> = {
  withConverter?: (converter: FirestoreDataConverter<T>) => unknown;
};
export function maybeWithConverter<T, R>(
  ref: R,
  converter: FirestoreDataConverter<T>
): R {
  try {
    const r = ref as unknown as WithConv<T>;
    if (r && typeof r.withConverter === 'function') {
      return r.withConverter(converter) as R;
    }
  } catch {
    // ignore
  }
  return ref;
}

function toFirestoreWithoutId<T extends { id?: unknown }>(
  modelObject: T
): DocumentData {
  const data: Record<string, unknown> = { ...modelObject };
  // Avoid storing local id field on documents
  delete (data as { id?: unknown }).id;
  return data as DocumentData;
}

function addId<T extends { id?: string }>(snapshot: QueryDocumentSnapshot): T {
  const data = snapshot.data() as unknown as Omit<T, 'id'>;
  return { id: snapshot.id, ...(data as object) } as T;
}

// Pass-through converters for core types (no field transforms)
export const profileConverter: FirestoreDataConverter<Profile> = {
  toFirestore(modelObject: Profile) {
    return toFirestoreWithoutId(modelObject);
  },
  fromFirestore(snapshot: QueryDocumentSnapshot) {
    return addId<Profile>(snapshot);
  },
};

export const membershipConverter: FirestoreDataConverter<Membership> = {
  toFirestore(modelObject: Membership) {
    return toFirestoreWithoutId(modelObject);
  },
  fromFirestore(snapshot: QueryDocumentSnapshot) {
    return addId<Membership>(snapshot);
  },
};

export const invoiceConverter: FirestoreDataConverter<Invoice> = {
  toFirestore(modelObject: Invoice) {
    return toFirestoreWithoutId(modelObject);
  },
  fromFirestore(snapshot: QueryDocumentSnapshot) {
    return addId<Invoice>(snapshot);
  },
};

export const eventConverter: FirestoreDataConverter<EventItem> = {
  toFirestore(modelObject: EventItem) {
    return toFirestoreWithoutId(modelObject);
  },
  fromFirestore(snapshot: QueryDocumentSnapshot) {
    return addId<EventItem>(snapshot);
  },
};

export const reportConverter: FirestoreDataConverter<MonthlyReport> = {
  toFirestore(modelObject: MonthlyReport) {
    return toFirestoreWithoutId(modelObject);
  },
  fromFirestore(snapshot: QueryDocumentSnapshot) {
    return addId<MonthlyReport>(snapshot);
  },
};

export const auditLogConverter: FirestoreDataConverter<AuditLog> = {
  toFirestore(modelObject: AuditLog) {
    return toFirestoreWithoutId(modelObject);
  },
  fromFirestore(snapshot: QueryDocumentSnapshot) {
    return addId<AuditLog>(snapshot);
  },
};

export const orgConverter: FirestoreDataConverter<Organization> = {
  toFirestore(modelObject: Organization) {
    return toFirestoreWithoutId(modelObject);
  },
  fromFirestore(snapshot: QueryDocumentSnapshot) {
    return addId<Organization>(snapshot);
  },
};

export const couponConverter: FirestoreDataConverter<Coupon> = {
  toFirestore(modelObject: Coupon) {
    return toFirestoreWithoutId(modelObject);
  },
  fromFirestore(snapshot: QueryDocumentSnapshot) {
    return addId<Coupon>(snapshot);
  },
};
