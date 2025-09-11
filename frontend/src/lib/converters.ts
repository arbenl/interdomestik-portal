import type { FirestoreDataConverter, QueryDocumentSnapshot } from 'firebase/firestore';
import type { Profile, Membership, Invoice, EventItem, MonthlyReport, AuditLog, Organization, Coupon } from '../types';

// Generic safe wrapper: only apply converter when the ref supports it (avoids breaking tests/mocks)
export function maybeWithConverter<T>(ref: any, converter: FirestoreDataConverter<T>): any {
  try {
    if (ref && typeof ref.withConverter === 'function') {
      return ref.withConverter(converter);
    }
  } catch {}
  return ref;
}

// Pass-through converters for core types (no field transforms)
export const profileConverter: FirestoreDataConverter<Profile> = {
  toFirestore(modelObject: Profile) {
    const { id, ...rest } = modelObject;
    return rest as any;
  },
  fromFirestore(snapshot: QueryDocumentSnapshot) {
    return snapshot.data() as any as Profile;
  },
};

export const membershipConverter: FirestoreDataConverter<Membership> = {
  toFirestore(modelObject: Membership) {
    const { id, ...rest } = modelObject;
    return rest as any;
  },
  fromFirestore(snapshot: QueryDocumentSnapshot) {
    return snapshot.data() as any as Membership;
  },
};

export const invoiceConverter: FirestoreDataConverter<Invoice> = {
  toFirestore(modelObject: Invoice) {
    const { id, ...rest } = modelObject;
    return rest as any;
  },
  fromFirestore(snapshot: QueryDocumentSnapshot) {
    return snapshot.data() as any as Invoice;
  },
};

export const eventConverter: FirestoreDataConverter<EventItem> = {
  toFirestore(modelObject: EventItem) {
    const { id, ...rest } = modelObject;
    return rest as any;
  },
  fromFirestore(snapshot: QueryDocumentSnapshot) {
    return snapshot.data() as any as EventItem;
  },
};

export const reportConverter: FirestoreDataConverter<MonthlyReport> = {
  toFirestore(modelObject: MonthlyReport) {
    const { id, ...rest } = modelObject;
    return rest as any;
  },
  fromFirestore(snapshot: QueryDocumentSnapshot) {
    return snapshot.data() as any as MonthlyReport;
  },
};

export const auditLogConverter: FirestoreDataConverter<AuditLog> = {
  toFirestore(modelObject: AuditLog) {
    const { id, ...rest } = modelObject;
    return rest as any;
  },
  fromFirestore(snapshot: QueryDocumentSnapshot) {
    return snapshot.data() as any as AuditLog;
  },
};

export const orgConverter: FirestoreDataConverter<Organization> = {
  toFirestore(modelObject: Organization) {
    const { id, ...rest } = modelObject;
    return rest as any;
  },
  fromFirestore(snapshot: QueryDocumentSnapshot) {
    return snapshot.data() as any as Organization;
  },
};

export const couponConverter: FirestoreDataConverter<Coupon> = {
  toFirestore(modelObject: Coupon) {
    const { id, ...rest } = modelObject;
    return rest as any;
  },
  fromFirestore(snapshot: QueryDocumentSnapshot) {
    return snapshot.data() as any as Coupon;
  },
};

