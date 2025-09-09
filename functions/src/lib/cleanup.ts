import { Timestamp } from 'firebase-admin/firestore';
import { db } from '../firebaseAdmin';

export async function cleanupOldAuditLogs(retentionDays = 180, maxDocs = 1000) {
  const threshold = Timestamp.fromMillis(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  let deleted = 0;
  while (deleted < maxDocs) {
    const snap = await db.collection('audit_logs')
      .where('ts', '<=', threshold)
      .limit(500)
      .get();
    if (snap.empty) break;
    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    deleted += snap.size;
  }
  return { deleted };
}

export async function cleanupOldMetrics(retentionDays = 400, maxDocs = 1000) {
  const threshold = Timestamp.fromMillis(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  let deleted = 0;
  while (deleted < maxDocs) {
    const snap = await db.collection('metrics')
      .where('ttlAt', '<=', threshold)
      .limit(500)
      .get();
    if (snap.empty) break;
    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    deleted += snap.size;
  }
  return { deleted };
}

