import * as functions from 'firebase-functions/v1';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { db } from './firebaseAdmin';

const REGION = 'europe-west1' as const;

type CallableContext = functions.https.CallableContext;

function ensureAdmin(context: CallableContext) {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Authentication required'
    );
  }
  const role = (context.auth.token as Record<string, unknown> | undefined)
    ?.role;
  if (role !== 'admin') {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Admin privileges required'
    );
  }
}

function normalizeAlertId(input: unknown): string {
  if (typeof input !== 'string' || input.trim() === '') {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'alertId must be a non-empty string'
    );
  }
  return input.trim();
}

export const acknowledgeAlert = functions
  .region(REGION)
  .https.onCall(async (data: unknown, context) => {
    ensureAdmin(context);
    const alertId = normalizeAlertId(
      typeof data === 'object' && data !== null
        ? (data as Record<string, unknown>).alertId
        : undefined
    );

    const docRef = db.collection('alertAcknowledgements').doc(alertId);
    const acknowledgedAt = Timestamp.now();
    await docRef.set(
      {
        acknowledgedAt,
        acknowledgedBy: context.auth!.uid,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    await db
      .collection('automationAlerts')
      .doc(alertId)
      .set(
        {
          acknowledged: true,
          acknowledgedAt,
          acknowledgedBy: context.auth!.uid,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      )
      .catch(() => undefined);

    return {
      acknowledged: true,
      acknowledgedAt: acknowledgedAt.toDate().toISOString(),
    };
  });

export type AcknowledgeAlertCallable = {
  alertId: string;
};
