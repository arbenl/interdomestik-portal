
import * as functions from "firebase-functions/v1";
import { upsertProfileSchema } from "./validators";
import { requireAuth } from "./rbac";
import { nextMemberNo, reserveUniqueEmail, reserveUniqueMemberNo } from "./unique";
import { admin, db } from "../firebaseAdmin";

export async function upsertProfileLogic(data: any, context: functions.https.CallableContext) {
  const auth = requireAuth(context);
  const validatedData = upsertProfileSchema.parse(data);

  const memberRef = db.collection('members').doc(auth.uid);

  await db.runTransaction(async (tx) => {
    const memberDoc = await tx.get(memberRef);

    // Normalize email from auth context
    const emailFromToken = (auth.token.email as string | undefined) || (memberDoc.exists ? (memberDoc.get('email') as string | undefined) : undefined);
    if (!emailFromToken) throw new functions.https.HttpsError('failed-precondition', 'Email missing on account');
    const emailLower = emailFromToken.toLowerCase();

    let memberNo = memberDoc.get('memberNo') as string | undefined;
    const nowTs = admin.firestore.FieldValue.serverTimestamp();

    if (!memberDoc.exists) {
      memberNo = await nextMemberNo(tx);
      await reserveUniqueMemberNo(auth.uid, memberNo, tx);
      // initialize server-only summary fields for new members
      tx.set(memberRef, {
        createdAt: nowTs,
        status: 'none',
        year: null,
        expiresAt: null,
      }, { merge: true });
    }

    // Reserve (or confirm) unique email
    await reserveUniqueEmail(auth.uid, emailLower, tx);

    tx.set(memberRef, {
      ...validatedData,
      email: emailLower,
      memberNo,
      updatedAt: nowTs,
    }, { merge: true });
  });

  return { message: "Profile updated successfully" };
}
