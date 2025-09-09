import { admin, db } from "../firebaseAdmin";
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import * as functions from "firebase-functions/v1";
import { startMembershipSchema } from "./validators";
import { requireAdmin } from "./rbac";
import { queueEmail, membershipCardHtml, sendPaymentReceipt } from "./membership";

export async function activateMembership(
  uid: string,
  year: number,
  price: number,
  currency: string,
  paymentMethod: string,
  externalRef: string | null | undefined
): Promise<{ refPath: string; alreadyActive: boolean }> {
  const startsAt = Timestamp.fromDate(new Date(year, 0, 1));
  const expiresAt = Timestamp.fromDate(new Date(year, 11, 31, 23, 59, 59));

  const ref = db.collection('members').doc(uid).collection('memberships').doc(String(year));

  let alreadyActive = false;
  await db.runTransaction(async (tx) => {
    const existing = await tx.get(ref);
    if (existing.exists && existing.get('status') === 'active') {
      alreadyActive = true;
    }

    tx.set(ref, {
      year,
      price,
      currency,
      paymentMethod,
      externalRef: externalRef ?? null,
      status: 'active',
      startedAt: startsAt,
      expiresAt,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    const memberRef = db.collection('members').doc(uid);
    tx.set(memberRef, {
      status: 'active',
      year,
      expiresAt,
      activeMembership: {
        year,
        status: 'active',
        expiresAt,
      },
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  });

  return { refPath: ref.path, alreadyActive };
}

export async function startMembershipLogic(data: any, context: functions.https.CallableContext) {
  requireAdmin(context);
  const { uid, year, price, currency, paymentMethod, externalRef } = startMembershipSchema.parse(data);

  const { refPath, alreadyActive } = await activateMembership(uid, year, price, currency, paymentMethod, externalRef);

  const memberDoc = await db.collection('members').doc(uid).get();
  const memberNo = memberDoc.get('memberNo');
  const name = memberDoc.get('name');
  const region = memberDoc.get('region');
  const email = memberDoc.get('email');

  const verifyUrl = `https://interdomestik.app/verify?memberNo=${memberNo}`;
  const html = membershipCardHtml({
    memberNo,
    name,
    region,
    validity: `${year}`,
    verifyUrl,
  });

  if (!alreadyActive) {
    await queueEmail({to: [email], subject: `Interdomestik Membership ${year}`, html});
  }

  // Send payment receipt if any payment recorded
  if (!alreadyActive && (price ?? 0) > 0) {
    await sendPaymentReceipt({
      email,
      name,
      memberNo,
      amount: price ?? 0,
      currency,
      method: paymentMethod,
      reference: externalRef ?? undefined,
    });
  }

  // Audit log
  try {
    await db.collection('audit_logs').add({
      action: 'startMembership',
      actor: context.auth?.uid || 'system',
      target: uid,
      year,
      amount: price ?? 0,
      currency,
      method: paymentMethod,
      ts: FieldValue.serverTimestamp(),
      ttlAt: Timestamp.fromDate(new Date(Date.now() + 180 * 24 * 60 * 60 * 1000)),
    });
  } catch (e) {
    console.warn('[audit] failed to write startMembership audit', e);
  }

  // Metrics: increment daily activations and by-region counts (best effort)
  try {
    const dateKey = new Date().toISOString().slice(0, 10); // YYYY-MM-DD (local UTC ok for coarse metrics)
    const ref = db.collection('metrics').doc(`daily-${dateKey}`);
    const inc = (admin.firestore.FieldValue as any).increment?.(1) || FieldValue.increment(1 as any);
    // Set a TTL on daily metrics (retain for ~400 days)
    const baseDay = new Date(`${dateKey}T00:00:00Z`);
    const ttlAt = Timestamp.fromDate(new Date(baseDay.getTime() + 400 * 24 * 60 * 60 * 1000));
    await ref.set({
      activations_total: inc,
      [`activations_by_region.${region || 'UNKNOWN'}`]: inc,
      updatedAt: FieldValue.serverTimestamp(),
      ttlAt,
    }, { merge: true });
  } catch (e) {
    console.warn('[metrics] failed to write activation metric', e);
  }

  return { message: "Membership started successfully", refPath };
}
