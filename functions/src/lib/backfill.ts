import * as functions from 'firebase-functions/v1';
import { db } from '../firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

function requireAdmin(ctx: functions.https.CallableContext) {
  if (!ctx.auth) throw new functions.https.HttpsError('unauthenticated', 'Sign in required');
  const role = (ctx.auth.token as any).role;
  if (role !== 'admin') throw new functions.https.HttpsError('permission-denied', 'Admins only');
}

export async function backfillNameLowerLogic(data: any, context: functions.https.CallableContext) {
  requireAdmin(context);
  const pageSize = Math.min(Number(data?.pageSize ?? 500), 1000);
  const startAfter = data?.startAfter ? String(data.startAfter) : undefined;

  let q = db.collection('members').orderBy('name').limit(pageSize);
  if (startAfter) q = q.startAfter(startAfter);
  const snap = await q.get();

  let updated = 0;
  if (!snap.empty) {
    const batch = db.batch();
    for (const d of snap.docs) {
      const name = (d.get('name') as string | undefined) || '';
      const nameLower = name.toLowerCase().trim();
      if ((d.get('nameLower') as string | undefined) !== nameLower) {
        batch.set(d.ref, { nameLower }, { merge: true });
        updated++;
      }
    }
    await batch.commit();
  }

  const nextStartAfter = snap.size === pageSize ? (snap.docs[snap.docs.length - 1].get('name') as string) : null;

  // Write a lightweight job log for traceability
  try {
    await db.collection('admin_jobs').add({
      job: 'backfillNameLower',
      actor: context.auth?.uid || 'unknown',
      pageSize,
      pageProcessed: snap.size,
      updated,
      nextStartAfter,
      ts: FieldValue.serverTimestamp(),
    } as any);
  } catch {}

  return { page: snap.size, updated, nextStartAfter };
}
