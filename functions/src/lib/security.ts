import * as functions from 'firebase-functions/v1';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { admin, db } from '../firebaseAdmin';
import { updateMfaPreferenceSchema } from './validators';
import { requireAuth } from './rbac';
import { log } from './logger';

export async function updateMfaPreferenceLogic(
  data: unknown,
  context: functions.https.CallableContext
) {
  const authContext = requireAuth(context);

  const normalized = {
    enabled:
      typeof (data as any)?.enabled === 'boolean'
        ? (data as any).enabled
        : typeof (data as any)?.enable === 'boolean'
          ? (data as any).enable
          : typeof (data as any)?.mfaEnabled === 'boolean'
            ? (data as any).mfaEnabled
            : undefined,
    uid:
      typeof (data as any)?.uid === 'string'
        ? String((data as any).uid)
        : undefined,
  };

  const parsed = updateMfaPreferenceSchema.safeParse(normalized);
  if (!parsed.success) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      parsed.error.issues[0]?.message ?? 'Invalid payload'
    );
  }

  const { enabled, uid } = parsed.data;
  const targetUid = uid ?? authContext.uid;
  if (!targetUid) {
    throw new functions.https.HttpsError('invalid-argument', 'uid missing');
  }

  const isSelf = targetUid === authContext.uid;
  const actorRole = (authContext.token as Record<string, unknown> | undefined)
    ?.role;
  if (!isSelf && actorRole !== 'admin') {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Admin privileges required to update other users'
    );
  }

  const userRecord = await admin.auth().getUser(targetUid);
  const existingClaims = userRecord.customClaims ?? {};
  const nextClaims = { ...existingClaims, mfaEnabled: enabled } as Record<
    string,
    unknown
  >;

  await admin.auth().setCustomUserClaims(targetUid, nextClaims);
  await db
    .collection('members')
    .doc(targetUid)
    .set(
      {
        mfaEnabled: enabled,
        security: {
          mfaEnabled: enabled,
          updatedAt: FieldValue.serverTimestamp(),
        },
      },
      { merge: true }
    );

  try {
    await db.collection('audit_logs').add({
      action: 'updateMfaPreference',
      actor: authContext.uid,
      target: targetUid,
      enabled,
      ts: FieldValue.serverTimestamp(),
      ttlAt: Timestamp.fromDate(
        new Date(Date.now() + 180 * 24 * 60 * 60 * 1000)
      ),
    });
  } catch (error) {
    log('audit_write_failed', {
      action: 'updateMfaPreference',
      targetUid,
      error: String(error),
    });
  }

  try {
    await admin.auth().revokeRefreshTokens(targetUid);
  } catch (error) {
    log('revoke_refresh_failed', { targetUid, error: String(error) });
  }

  return { ok: true, uid: targetUid, enabled };
}
