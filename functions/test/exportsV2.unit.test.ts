import { expect } from 'chai';
import sinon from 'sinon';
import { admin, db } from '../src/firebaseAdmin';
import { buildMembersQuery, normalizeColumns, streamMembersCsv } from '../src/lib/exportsV2';

describe('exportsV2 helpers', () => {
  const uid = 'u_exports_' + Date.now();
  before(async () => {
    await admin.auth().createUser({ uid, email: `exp_${Date.now()}@example.com` }).catch(()=>{});
    await admin.auth().setCustomUserClaims(uid, { role: 'admin', allowedRegions: ['PRISHTINA','PEJA'] });
    // Seed a few members
    const now = admin.firestore.Timestamp.now();
    const soon = admin.firestore.Timestamp.fromDate(new Date(Date.now() + 7*24*3600*1000));
    await db.collection('members').doc('m1').set({ memberNo: 'INT-2025-000010', name: 'A', email: 'a@ex.com', region: 'PRISHTINA', status: 'active', expiresAt: soon, createdAt: now });
    await db.collection('members').doc('m2').set({ memberNo: 'INT-2025-000011', name: 'B', email: 'b@ex.com', region: 'PEJA', status: 'expired', expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now()-86400000)), createdAt: now });
    await db.collection('members').doc('m3').set({ memberNo: 'INT-2025-000012', name: 'C', email: 'c@ex.com', region: 'GJAKOVA', status: 'active', expiresAt: soon, createdAt: now });
  });

  it('normalizeColumns respects presets and filters unknown columns', () => {
    const cols = normalizeColumns(['memberNo','name','email','secret'], 'BASIC');
    expect(cols).to.include('memberNo');
    expect(cols).to.include('email');
    expect(cols).to.not.include('secret' as any);
  });

  it('buildMembersQuery intersects admin allowedRegions with filter', async () => {
    const q = buildMembersQuery({ regions: ['PRISHTINA','GJAKOVA'] } as any, ['PRISHTINA','PEJA']);
    const snap = await q.get();
    const regions = new Set(snap.docs.map(d=> d.get('region')));
    expect(regions.has('PRISHTINA')).to.equal(true);
    expect(regions.has('GJAKOVA')).to.equal(false);
  });

  it('streamMembersCsv writes CSV to storage and reports rows/size', async () => {
    // Stub storage write stream
    const writeChunks: string[] = [];
    const stub = sinon.stub(admin, 'storage').callsFake(() => ({
      bucket: () => ({
        file: () => ({
          createWriteStream: () => ({
            write: (s: string) => { writeChunks.push(s); },
            end: (cb?: Function) => { if (cb) cb(); },
          })
        })
      })
    } as any));
    try {
      const res = await streamMembersCsv({ exportId: 't1', filters: { regions: ['PRISHTINA','PEJA'] } as any, columns: normalizeColumns(['memberNo','name','region'],'BASIC'), actorUid: uid, path: 'exports/test.csv' });
      expect(res.rows).to.be.greaterThan(0);
      expect(res.size).to.be.greaterThan(0);
    } finally {
      stub.restore();
    }
  });
});
