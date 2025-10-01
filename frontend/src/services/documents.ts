import callFn from '@/services/functionsClient';
import { firestore } from '@/lib/firebase';
import {
  collection,
  getDocs,
  orderBy,
  query,
  where,
  type DocumentData,
  type QueryConstraint,
} from 'firebase/firestore';

export type DocumentShareRecipient = {
  uid: string;
  name?: string | null;
  email?: string | null;
  region?: string | null;
};

export type DocumentShare = {
  id: string;
  ownerUid: string;
  ownerRole?: string | null;
  fileName: string;
  storagePath: string;
  mimeType?: string | null;
  recipients: DocumentShareRecipient[];
  allowedUids: string[];
  createdAt?: Date | null;
  updatedAt?: Date | null;
  note?: string | null;
};

export type DocumentShareActivity = {
  id: string;
  action: string;
  actorUid: string;
  recipients: string[];
  note?: string | null;
  createdAt?: Date | null;
};

export type ShareDocumentPayload = {
  documentId?: string;
  fileName: string;
  storagePath: string;
  mimeType?: string;
  note?: string;
  recipients: string[];
};

export type ShareDocumentResponse = {
  ok: boolean;
  id: string;
  recipients: string[];
};

export async function shareDocument(
  payload: ShareDocumentPayload
): Promise<ShareDocumentResponse> {
  const trimmedRecipients = Array.from(
    new Set(payload.recipients.map((uid) => uid.trim()).filter(Boolean))
  );
  if (trimmedRecipients.length === 0) {
    throw new Error('At least one recipient uid is required');
  }
  const result = await callFn<ShareDocumentPayload, ShareDocumentResponse>(
    'shareDocument',
    {
      documentId: payload.documentId,
      fileName: payload.fileName,
      storagePath: payload.storagePath,
      mimeType: payload.mimeType,
      note: payload.note,
      recipients: trimmedRecipients,
    }
  );
  return result;
}

export async function fetchDocumentSharesForUser(
  uid: string
): Promise<DocumentShare[]> {
  const constraints: QueryConstraint[] = [where('ownerUid', '==', uid)];
  const ownerQuery = query(
    collection(firestore, 'documentShares'),
    ...constraints
  );
  const sharedWithQuery = query(
    collection(firestore, 'documentShares'),
    where('allowedUids', 'array-contains', uid)
  );

  const [ownerSnap, sharedSnap] = await Promise.all([
    getDocs(ownerQuery),
    getDocs(sharedWithQuery),
  ]);

  const map = new Map<string, DocumentShare>();
  for (const doc of ownerSnap.docs) {
    map.set(doc.id, normalizeShare(doc.id, doc.data()));
  }
  for (const doc of sharedSnap.docs) {
    map.set(doc.id, normalizeShare(doc.id, doc.data()));
  }

  return Array.from(map.values()).sort((a, b) => {
    const aTime = a.updatedAt?.getTime?.() ?? 0;
    const bTime = b.updatedAt?.getTime?.() ?? 0;
    return bTime - aTime;
  });
}

function normalizeShare(id: string, data: DocumentData): DocumentShare {
  const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : null;
  const updatedAt = data.updatedAt?.toDate ? data.updatedAt.toDate() : null;
  const recipientsArray = Array.isArray(data.recipients) ? data.recipients : [];
  const allowedUids = Array.isArray(data.allowedUids)
    ? data.allowedUids.filter(
        (value: unknown): value is string => typeof value === 'string'
      )
    : [];

  const recipients: DocumentShareRecipient[] = recipientsArray
    .filter(
      (value: unknown): value is Record<string, unknown> =>
        typeof value === 'object' && value !== null
    )
    .map((item) => ({
      uid: typeof item.uid === 'string' ? item.uid : '',
      name: typeof item.name === 'string' ? item.name : null,
      email: typeof item.email === 'string' ? item.email : null,
      region: typeof item.region === 'string' ? item.region : null,
    }))
    .filter((recipient) => recipient.uid);

  return {
    id,
    ownerUid: typeof data.ownerUid === 'string' ? data.ownerUid : '',
    ownerRole: typeof data.ownerRole === 'string' ? data.ownerRole : null,
    fileName: typeof data.fileName === 'string' ? data.fileName : 'Document',
    storagePath: typeof data.storagePath === 'string' ? data.storagePath : '',
    mimeType: typeof data.mimeType === 'string' ? data.mimeType : null,
    recipients,
    allowedUids,
    createdAt,
    updatedAt,
    note: typeof data.note === 'string' ? data.note : null,
  };
}

export async function fetchDocumentShareActivity(
  shareId: string
): Promise<DocumentShareActivity[]> {
  const activityQuery = query(
    collection(firestore, 'documentShares', shareId, 'activity'),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(activityQuery);
  const items: DocumentShareActivity[] = snapshot.docs.map((doc) => {
    const data = doc.data();
    const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : null;
    return {
      id: doc.id,
      action: typeof data.action === 'string' ? data.action : 'updated',
      actorUid: typeof data.actorUid === 'string' ? data.actorUid : 'unknown',
      recipients: Array.isArray(data.recipients)
        ? data.recipients.filter(
            (value: unknown): value is string => typeof value === 'string'
          )
        : [],
      note: typeof data.note === 'string' ? data.note : null,
      createdAt,
    };
  });

  return items.sort((a, b) => {
    const aTime = a.createdAt?.getTime?.() ?? 0;
    const bTime = b.createdAt?.getTime?.() ?? 0;
    return bTime - aTime;
  });
}
