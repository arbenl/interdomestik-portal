import * as functions from 'firebase-functions/v1';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { admin, db } from '../firebaseAdmin';
import { shareDocumentSchema } from './validators';
import { requireAuth } from './rbac';
import { log } from './logger';

type RecipientRecord = {
  uid: string;
  email?: string | null;
  name?: string | null;
  region?: string | null;
};

type ActorClaims = {
  role?: string;
  allowedRegions?: string[];
};

export async function shareDocumentLogic(rawData: unknown, context: functions.https.CallableContext) {
  const auth = requireAuth(context);
  const actorClaims = (auth.token ?? {}) as ActorClaims;
  const actorRole = actorClaims.role ?? 'member';
  const isAdmin = actorRole === 'admin';
  const isAgent = actorRole === 'agent';
  if (!isAdmin && !isAgent) {
    throw new functions.https.HttpsError('permission-denied', 'Only admins or agents may share documents.');
  }

  const parsed = shareDocumentSchema.parse(rawData);
  const recipientUids = Array.from(new Set(parsed.recipients.map(r => r.uid)));
  if (recipientUids.length === 0) {
    throw new functions.https.HttpsError('invalid-argument', 'At least one unique recipient is required.');
  }

  const memberDocs = await Promise.all(recipientUids.map(async uid => {
    const snap = await db.collection('members').doc(uid).get();
    if (!snap.exists) {
      throw new functions.https.HttpsError('not-found', `Member ${uid} does not exist.`);
    }
    return { uid, data: snap.data() as Record<string, unknown> };
  }));

  if (isAgent) {
    const agentRegions = Array.isArray(actorClaims.allowedRegions) ? actorClaims.allowedRegions : [];
    if (agentRegions.length === 0) {
      throw new functions.https.HttpsError('permission-denied', 'Agent has no allowed regions configured.');
    }
    for (const { data } of memberDocs) {
      const memberRegion = typeof data.region === 'string' ? data.region : null;
      if (!memberRegion || !agentRegions.includes(memberRegion)) {
        throw new functions.https.HttpsError('permission-denied', 'Agent cannot share documents outside their allowed regions.');
      }
    }
  }

  const docRef = parsed.documentId
    ? db.collection('documentShares').doc(parsed.documentId)
    : db.collection('documentShares').doc();

  const recipientsDetailed: RecipientRecord[] = memberDocs.map(({ uid, data }) => ({
    uid,
    email: typeof data.email === 'string' ? data.email : null,
    name: typeof data.name === 'string' ? data.name : null,
    region: typeof data.region === 'string' ? data.region : null,
  }));
  const allowedUids = Array.from(new Set([...recipientUids, auth.uid]));
  const now = FieldValue.serverTimestamp();

  await db.runTransaction(async txn => {
    const existing = await txn.get(docRef);
    const ownerUid = existing.exists ? (existing.get('ownerUid') as string | undefined) : undefined;
    if (existing.exists && ownerUid && ownerUid !== auth.uid && !isAdmin) {
      throw new functions.https.HttpsError('permission-denied', 'Only the owner or an admin can update this document share.');
    }

    const baseData: Record<string, unknown> = {
      ownerUid: ownerUid ?? auth.uid,
      ownerRole: existing.exists ? (existing.get('ownerRole') ?? actorRole) : actorRole,
      fileName: parsed.fileName,
      storagePath: parsed.storagePath,
      mimeType: parsed.mimeType ?? existing.get('mimeType') ?? null,
      allowedUids,
      recipients: recipientsDetailed,
      status: 'shared',
      lastActionBy: auth.uid,
      updatedAt: now,
    };
    if (parsed.note !== undefined) {
      baseData.note = parsed.note;
    }
    if (!existing.exists) {
      baseData.createdAt = now;
    }

    txn.set(docRef, baseData, { merge: true });
    txn.set(docRef.collection('activity').doc(), {
      action: existing.exists ? 'updated' : 'created',
      actorUid: auth.uid,
      recipients: recipientUids,
      note: parsed.note ?? null,
      createdAt: now,
    });
  });

  try {
    await db.collection('audit_logs').add({
      action: 'shareDocument',
      actor: auth.uid,
      target: docRef.id,
      recipients: recipientUids,
      ts: FieldValue.serverTimestamp(),
      ttlAt: Timestamp.fromDate(new Date(Date.now() + 180 * 24 * 60 * 60 * 1000)),
    });
  } catch (error) {
    log('audit_write_failed', { action: 'shareDocument', shareId: docRef.id, error: String(error) });
  }

  return {
    ok: true,
    id: docRef.id,
    recipients: recipientUids,
  };
}
