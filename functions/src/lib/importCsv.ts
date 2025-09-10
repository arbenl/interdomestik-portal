import * as functions from 'firebase-functions/v1';
import { db } from '../firebaseAdmin';
import { requireAdmin } from './rbac';

type ImportReport = { rows: number; created: number; updated: number; errors: Array<{ line: number; email?: string; error: string }>; };

function parseCsv(csv: string): Array<{ email: string; name: string; region: string; phone?: string; orgId?: string }> {
  const lines = csv.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];
  let header = lines[0].split(',').map(h => h.trim().toLowerCase());
  const rows: any[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim());
    const row: any = {};
    header.forEach((h, idx) => { row[h] = cols[idx]; });
    rows.push(row);
  }
  return rows.map(r => ({ email: String(r.email || '').toLowerCase(), name: String(r.name || ''), region: String(r.region || ''), phone: r.phone, orgId: r.orgId }));
}

export async function importMembersCsvLogic(data: any, context: functions.https.CallableContext): Promise<ImportReport> {
  requireAdmin(context);
  const csv: string = String(data?.csv || '');
  const dryRun: boolean = !!data?.dryRun || data?.dryRun === undefined;
  const errors: ImportReport['errors'] = [];

  const items = parseCsv(csv);
  let created = 0;
  let updated = 0;
  if (!dryRun) {
    // Minimal implementation: upsert member docs by email if they exist in registry
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.email || !it.name || !it.region) {
        errors.push({ line: i + 2, email: it.email, error: 'Missing required fields' });
        continue;
      }
      try {
        const reg = await db.collection('registry_email').doc(it.email).get();
        if (reg.exists) {
          const uid = reg.get('uid') as string;
          await db.collection('members').doc(uid).set({ name: it.name, region: it.region, phone: it.phone || undefined, orgId: it.orgId || undefined }, { merge: true });
          updated++;
        } else {
          // In this minimal scaffold, we do not create auth users; count as error
          errors.push({ line: i + 2, email: it.email, error: 'User not found (scaffold)' });
        }
      } catch (e) {
        errors.push({ line: i + 2, email: it.email, error: String(e) });
      }
    }
  }

  return { rows: items.length, created, updated, errors };
}

