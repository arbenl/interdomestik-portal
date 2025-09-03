import { admin, db } from "../firebaseAdmin";
import * as functions from "firebase-functions/v1";
import { setUserRoleSchema } from "./validators";
import { requireAdmin } from "./rbac";

export async function setUserRoleLogic(data: any, context: functions.https.CallableContext) {
  requireAdmin(context);
  const { uid, role, allowedRegions } = setUserRoleSchema.parse(data);

  await admin.auth().setCustomUserClaims(uid, { role, allowedRegions });
  await db.collection('members').doc(uid).set({ role, allowedRegions }, { merge: true });

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
