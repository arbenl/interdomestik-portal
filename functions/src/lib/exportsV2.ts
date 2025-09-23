import { admin, db } from '../firebaseAdmin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { log } from './logger';

export type ExportStatus = 'pending'|'running'|'success'|'error'|'cancelled';

export type ExportFilters = {
  regions?: string[];
  status?: 'active'|'expired'|'none'|string;
  expiringBefore?: Timestamp;
  expiringAfter?: Timestamp;
  orgId?: string;
};

export const BASIC_COLUMNS = [
  'memberNo','name','email','phone','region','orgId','active','expiresAt'
] as const;
export const FULL_ADMIN_COLUMNS = [
  'memberNo','name','email','phone','region','orgId','status','year','expiresAt','agentId','createdAt','updatedAt'
] as const;
export type AllowedColumn = (typeof BASIC_COLUMNS)[number] | (typeof FULL_ADMIN_COLUMNS)[number];

export function normalizeColumns(columns?: string[]|null, preset?: 'BASIC'|'FULL'): AllowedColumn[] {
  let allowed: AllowedColumn[] = [...BASIC_COLUMNS];
  if (preset === 'FULL') allowed = [...FULL_ADMIN_COLUMNS];
  if (!columns || columns.length === 0) return allowed;
  const set = new Set<AllowedColumn>(allowed);
  return columns.filter((c) => set.has(c as AllowedColumn)) as AllowedColumn[];
}

export function buildMembersQuery(filters: ExportFilters, allowedRegions: string[]|undefined) {
  let q: FirebaseFirestore.Query = db.collection('members');
  const filterRegions = Array.isArray(filters.regions) ? filters.regions.filter(Boolean) : [];
  const adminRegions = Array.isArray(allowedRegions) ? allowedRegions.filter(Boolean) : [];
  let regionsToUse = filterRegions.length > 0 ? filterRegions : adminRegions;
  if (adminRegions.length > 0 && filterRegions.length > 0) {
    regionsToUse = filterRegions.filter((r) => adminRegions.includes(r));
  }
  if (regionsToUse.length > 0) q = q.where('region', 'in', regionsToUse.slice(0, 10));
  if (filters.status) q = q.where('status', '==', filters.status);
  if (filters.orgId) q = q.where('orgId', '==', filters.orgId);
  if (filters.expiringAfter) q = q.where('expiresAt', '>=', filters.expiringAfter);
  if (filters.expiringBefore) q = q.where('expiresAt', '<=', filters.expiringBefore);
  q = q.orderBy('memberNo');
  return q as FirebaseFirestore.Query<FirebaseFirestore.DocumentData>;
}

export async function streamMembersCsv({
  exportId,
  filters,
  columns,
  actorUid,
  path,
}: {
  exportId: string;
  filters: ExportFilters;
  columns: AllowedColumn[];
  actorUid: string;
  path: string;
}): Promise<{ rows: number; size: number; url?: string }> {
  log('export_worker_start', { export_id: exportId, actor: actorUid });
  const file = admin.storage().bucket().file(path);
  const stream = file.createWriteStream({ contentType: 'text/csv; charset=utf-8', resumable: false });
  const header = columns.join(',') + '\n';
  stream.write(header);
  let rows = 0;
  let size = header.length;

  const user = await admin.auth().getUser(actorUid).catch(() => null);
  const allowedRegions = (user?.customClaims?.allowedRegions as string[] | undefined) || undefined;
  let q = buildMembersQuery(filters, allowedRegions);
  const pageSize = 500;
  let last: FirebaseFirestore.DocumentSnapshot | null = null;
  for (;;) {
    let page = q.limit(pageSize);
    if (last) page = page.startAfter(last);
    const snap = await page.get();
    if (snap.empty) break;
    for (const d of snap.docs) {
      const m = d.data() as any;
      const row: string[] = [];
      for (const col of columns) {
        let v: any = '';
        switch (col) {
          case 'memberNo': v = m.memberNo; break;
          case 'name': v = m.name; break;
          case 'email': v = m.email; break;
          case 'phone': v = m.phone; break;
          case 'region': v = m.region; break;
          case 'orgId': v = m.orgId; break;
          case 'status': v = m.status; break;
          case 'year': v = m.year; break;
          case 'expiresAt': v = m.expiresAt?.toDate ? m.expiresAt.toDate().toISOString().slice(0,10) : ''; break;
          case 'agentId': v = m.agentId; break;
          case 'createdAt': v = m.createdAt?.toDate ? m.createdAt.toDate().toISOString() : ''; break;
          case 'updatedAt': v = m.updatedAt?.toDate ? m.updatedAt.toDate().toISOString() : ''; break;
          case 'active': v = m.status === 'active' || (!!m.expiresAt && m.expiresAt.toDate && m.expiresAt.toDate() > new Date()); break;
          default: v = '';
        }
        const safe = (s: any) => (s == null ? '' : String(s).replace(/"/g, '""'));
        row.push(`"${safe(v)}"`);
      }
      const line = row.join(',') + '\n';
      stream.write(line);
      rows += 1;
      size += line.length;
      if (rows % 500 === 0) {
        await db.collection('exports').doc(exportId).set({ progress: { rows, bytes: size }, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      }
    }
    last = snap.docs[snap.docs.length - 1];
  }
  await new Promise<void>((resolve) => stream.end(resolve));
  let url: string | undefined;
  try {
    const [signed] = await file.getSignedUrl({ action: 'read', expires: Date.now() + 3 * 24 * 3600 * 1000 });
    url = signed;
  } catch {}
  log('export_worker_done', { export_id: exportId, rows, size });
  return { rows, size, url };
}

