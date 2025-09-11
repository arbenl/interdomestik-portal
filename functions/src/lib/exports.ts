import { admin, db } from '../firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';

export async function generateMembersCsv(): Promise<{ csv: string; count: number }> {
  // Load members (single query)
  const membersSnap = await db
    .collection('members')
    .orderBy('memberNo')
    .limit(10000)
    .get();

  const membersOrdered: Array<{ uid: string; data: any }> = [];
  const membersMap = new Map<string, any>();
  for (const doc of membersSnap.docs) {
    const m = doc.data();
    membersOrdered.push({ uid: doc.id, data: m });
    membersMap.set(doc.id, m);
  }

  // Active memberships (collectionGroup)
  const now = Timestamp.now();
  const activeSnap = await db
    .collectionGroup('memberships')
    .where('status', '==', 'active')
    .where('expiresAt', '>', now)
    .get();

  const activeUidSet = new Set<string>();
  for (const d of activeSnap.docs) {
    const uid = d.ref.parent.parent!.id;
    if (membersMap.has(uid)) activeUidSet.add(uid);
  }

  const lines = ['memberNo,name,email,phone,region,orgId,active'];
  const safe = (s: any) => (s == null ? '' : String(s).replace(/"/g, '""'));
  for (const { uid, data: m } of membersOrdered) {
    const active = activeUidSet.has(uid) ? 'yes' : 'no';
    lines.push(`"${safe(m.memberNo)}","${safe(m.name)}","${safe(m.email)}","${safe(m.phone)}","${safe(m.region)}","${safe(m.orgId)}","${active}"`);
  }

  return { csv: lines.join('\n'), count: membersOrdered.length };
}

export async function saveCsvToStorage(csv: string, path: string): Promise<{ url?: string; size: number }> {
  const bucket = admin.storage().bucket();
  const file = bucket.file(path);
  await file.save(Buffer.from(csv, 'utf8'), { contentType: 'text/csv; charset=utf-8', resumable: false });
  const [metadata] = await file.getMetadata();
  let url: string | undefined;
  try {
    const [signed] = await file.getSignedUrl({ action: 'read', expires: Date.now() + 7 * 24 * 3600 * 1000 });
    url = signed;
  } catch {
    // If signed URL fails (emulator or missing perms), leave undefined
  }
  const size = Number(metadata.size || 0);
  return { url, size };
}

