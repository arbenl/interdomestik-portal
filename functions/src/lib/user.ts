import { admin, db } from "../firebaseAdmin";
import { FieldValue } from 'firebase-admin/firestore';
import * as functions from "firebase-functions/v1";
import { setUserRoleSchema } from "./validators";
import { requireAdmin } from "./rbac";

export async function setUserRoleLogic(data: any, context: functions.https.CallableContext) {
  requireAdmin(context);
  const { uid, role, allowedRegions } = setUserRoleSchema.parse(data);

  await admin.auth().setCustomUserClaims(uid, { role, allowedRegions });
  await db.collection('members').doc(uid).set({ role, allowedRegions }, { merge: true });

  // Audit log
  try {
    await db.collection('audit_logs').add({
      action: 'setUserRole',
      actor: context.auth?.uid || 'system',
      target: uid,
      role,
      allowedRegions: allowedRegions ?? [],
      ts: FieldValue.serverTimestamp(),
    });
  } catch (e) {
    console.warn('[audit] failed to write setUserRole audit', e);
  }

  return { message: "User role updated successfully" };
}

export async function searchUserByEmailLogic(data: any, context: functions.https.CallableContext) {
  requireAdmin(context);
  const { email } = data;
  try {
    const userRecord = await admin.auth().getUserByEmail(email);
    return { uid: userRecord.uid };
  } catch (error) {
    throw new functions.https.HttpsError('not-found', 'User not found');
  }
}

export async function getUserClaimsLogic(data: any, context: functions.https.CallableContext) {
  requireAdmin(context);
  const uid = String(data?.uid || '').trim();
  if (!uid) throw new functions.https.HttpsError('invalid-argument', 'uid required');
  const user = await admin.auth().getUser(uid);
  const claims = (user.customClaims || {}) as Record<string, unknown>;
  return { uid, claims };
}
