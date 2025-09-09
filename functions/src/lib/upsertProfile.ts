
import * as functions from "firebase-functions/v1";
import { upsertProfileSchema } from "./validators";
import { requireAuth } from "./rbac";
import { nextMemberNo, reserveUniqueEmail, reserveUniqueMemberNo } from "./unique";
import { admin, db } from "../firebaseAdmin";
import { FieldValue } from 'firebase-admin/firestore';

export async function upsertProfileLogic(data: any, context: functions.https.CallableContext) {
  try {
    const auth = requireAuth(context);
    const validatedData = upsertProfileSchema.parse(data);
    if (process.env.FUNCTIONS_EMULATOR) {
      console.log('[upsertProfile] uid', auth.uid, 'data', JSON.stringify(validatedData));
    }

    // Resolve email once outside the transaction
    let emailLower: string | undefined = (auth.token.email as string | undefined)?.toLowerCase();
    if (!emailLower) {
      const userRecord = await admin.auth().getUser(auth.uid);
      if (!userRecord.email) {
        throw new functions.https.HttpsError('failed-precondition', 'Email missing on account');
      }
      emailLower = userRecord.email.toLowerCase();
    }

    const memberRef = db.collection('members').doc(auth.uid);

    await db.runTransaction(async (tx) => {
      const memberDoc = await tx.get(memberRef);
      if (process.env.FUNCTIONS_EMULATOR) {
        console.log('[upsertProfile] memberDoc.exists', memberDoc.exists);
      }

      let memberNo = memberDoc.get('memberNo') as string | undefined;
      const nowTs = FieldValue.serverTimestamp();

      if (!memberDoc.exists) {
        memberNo = await nextMemberNo(tx);
        await reserveUniqueMemberNo(auth.uid, memberNo, tx);
        tx.set(memberRef, {
          createdAt: nowTs,
          status: 'none',
          year: null,
          expiresAt: null,
        }, { merge: true });
      }

      if (process.env.FUNCTIONS_EMULATOR) {
        console.log('[upsertProfile] reserving email', emailLower);
      }
      await reserveUniqueEmail(auth.uid, emailLower!, tx);

      tx.set(memberRef, {
        ...validatedData,
        nameLower: String(validatedData.name || '').toLowerCase().trim(),
        email: emailLower,
        memberNo,
        updatedAt: nowTs,
      }, { merge: true });
    });

    // Keep Firebase Auth displayName in sync with profile name
    try {
      await admin.auth().updateUser(auth.uid, { displayName: validatedData.name });
    } catch (e) {
      // Non-fatal: log and continue
      console.warn('[upsertProfile] failed to update auth displayName', e);
    }

    if (process.env.FUNCTIONS_EMULATOR) {
      console.log('[upsertProfile] success', auth.uid);
    }
    return { message: "Profile updated successfully" };
  } catch (err: any) {
    const msg = String(err?.message || err);
    if (msg.includes('EMAIL_IN_USE')) {
      throw new functions.https.HttpsError('already-exists', 'Email is already registered');
    }
    if (msg.includes('MEMBERNO_IN_USE')) {
      throw new functions.https.HttpsError('aborted', 'Member number conflict, retry');
    }
    // Validation errors from zod
    if (err?.issues) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid profile data');
    }
    console.error('[upsertProfile] unexpected', err?.stack || err);
    throw new functions.https.HttpsError('internal', 'Profile update failed', msg);
  }
}
