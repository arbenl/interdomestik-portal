import { FieldValue } from 'firebase-admin/firestore';
import { db } from '../firebaseAdmin';

export async function setAutoRenewLogic(
  requestingUid: string,
  targetUid: string | undefined,
  autoRenew: boolean,
  isAdmin: boolean
) {
  const uid = isAdmin && targetUid ? targetUid : requestingUid;
  await db
    .collection('members')
    .doc(uid)
    .set(
      { autoRenew, updatedAt: FieldValue.serverTimestamp() },
      { merge: true }
    );
  return { ok: true, uid, autoRenew };
}
