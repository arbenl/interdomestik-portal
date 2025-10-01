import * as functions from 'firebase-functions/v1';
import { admin, db } from '../firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import { agentCreateMemberSchema, regionEnum } from './validators';
import { FieldValue as Fv, Timestamp } from 'firebase-admin/firestore';
import type { z } from 'zod';

function requireAgentOrAdmin(ctx: functions.https.CallableContext) {
  if (!ctx.auth)
    throw new functions.https.HttpsError('unauthenticated', 'Sign in required');
  const role = (ctx.auth.token as any).role;
  if (role !== 'agent' && role !== 'admin') {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Agent or admin only'
    );
  }
  return ctx.auth;
}

function agentHasRegion(
  ctx: functions.https.CallableContext,
  region: z.infer<typeof regionEnum>
): boolean {
  const role = (ctx.auth!.token as any).role;
  if (role === 'admin') return true;
  const allowed = (ctx.auth!.token as any).allowedRegions as
    | string[]
    | undefined;
  return Array.isArray(allowed) && allowed.includes(region);
}

export async function agentCreateMemberLogic(
  data: any,
  context: functions.https.CallableContext
) {
  const auth = requireAgentOrAdmin(context);
  const input = agentCreateMemberSchema.parse(data);

  if (!agentHasRegion(context, input.region)) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Region not allowed'
    );
  }

  const emailLower = input.email.toLowerCase();

  // Find or create Auth user
  let userRecord: admin.auth.UserRecord;
  try {
    userRecord = await admin.auth().getUserByEmail(emailLower);
  } catch {
    // Create with a random strong password (user can reset via email link later)
    const randomPass =
      Math.random().toString(36).slice(2) +
      Math.random().toString(36).toUpperCase().slice(2);
    userRecord = await admin.auth().createUser({
      email: emailLower,
      password: randomPass,
      displayName: input.name,
    });
  }

  // Ensure role=member claim
  const currentClaims = (userRecord.customClaims as any) || {};
  if (!currentClaims.role) {
    await admin.auth().setCustomUserClaims(userRecord.uid, {
      ...currentClaims,
      role: 'member',
    });
  }

  const memberRef = db.collection('members').doc(userRecord.uid);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(memberRef);
    let memberNo = snap.exists
      ? (snap.get('memberNo') as string | undefined)
      : undefined;
    const nowTs = FieldValue.serverTimestamp();

    // Prepare refs
    const emailRef = db.collection('registry_email').doc(emailLower);
    const envYear = Number(process.env.MEMBER_YEAR);
    const year =
      !Number.isNaN(envYear) && envYear >= 2020 && envYear <= 2100
        ? envYear
        : new Date().getUTCFullYear();
    const counterRef = db.doc(`counters/members-${year}`);

    // Pre-reads (all reads before any writes)
    const [emailReg, counterSnap] = await Promise.all([
      tx.get(emailRef),
      tx.get(counterRef),
    ]);

    if (emailReg.exists && emailReg.get('uid') !== userRecord.uid) {
      throw new Error('EMAIL_IN_USE');
    }

    let nextNo: number | undefined;
    if (!snap.exists || !memberNo) {
      nextNo = ((counterSnap.exists && counterSnap.get('current')) || 0) + 1;
      const seq = String(nextNo).padStart(6, '0');
      memberNo = `INT-${year}-${seq}`;
      const memberNoRef = db.collection('registry_memberNo').doc(memberNo);
      const memberNoSnap = await tx.get(memberNoRef);
      if (memberNoSnap.exists && memberNoSnap.get('uid') !== userRecord.uid) {
        throw new Error('MEMBERNO_IN_USE');
      }
      // Writes after all reads
      tx.set(counterRef, { current: nextNo }, { merge: true });
      tx.set(memberNoRef, { uid: userRecord.uid }, { merge: true });
    }

    // Reserve email after read checks
    tx.set(emailRef, { uid: userRecord.uid }, { merge: true });

    tx.set(
      memberRef,
      {
        email: emailLower,
        name: input.name,
        nameLower: input.name.toLowerCase().trim(),
        region: input.region,
        phone: input.phone,
        orgId: input.orgId,
        memberNo,
        agentId: auth.uid,
        status: snap.exists ? (snap.get('status') ?? 'none') : 'none',
        year: snap.exists ? (snap.get('year') ?? null) : null,
        expiresAt: snap.exists ? (snap.get('expiresAt') ?? null) : null,
        createdAt: snap.exists ? (snap.get('createdAt') ?? nowTs) : nowTs,
        updatedAt: nowTs,
      },
      { merge: true }
    );
  });

  return { uid: userRecord.uid };
}
