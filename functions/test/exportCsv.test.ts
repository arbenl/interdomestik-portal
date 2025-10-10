import { expect } from 'chai';
import { admin, db } from '../src/firebaseAdmin';
import { exportMembersCsv } from '../src/exportMembersCsv';

function makeReqRes(token?: string) {
  const headers: Record<string, string> = {} as any;
  const req: any = {
    method: 'GET',
    headers: token ? { authorization: `Bearer ${token}` } : {},
  };
  let statusCode = 200;
  let body: any;
  const outHeaders: Record<string, string> = {};
  let resolveDone: (() => void) | undefined;
  const done = new Promise<void>((resolve) => {
    resolveDone = resolve;
  });
  const res: any = {
    set: (k: string, v: string) => {
      outHeaders[k] = v;
      return res;
    },
    setHeader: (k: string, v: string) => {
      outHeaders[k] = v as any;
    },
    getHeader: (k: string) => outHeaders[k],
    header: (k: string, v: string) => {
      outHeaders[k] = v;
      return res;
    },
    status: (c: number) => {
      statusCode = c;
      return res;
    },
    send: (b: any) => {
      body = b;
       resolveDone?.();
      return res;
    },
    end: (b?: any) => {
      if (typeof b !== 'undefined') body = b;
      resolveDone?.();
      return res;
    },
  };
  return {
    req,
    res,
    done,
    get: () => ({ statusCode, body, headers: outHeaders }),
  };
}

describe('exportMembersCsv', () => {
  it('responds with CSV for admin', async () => {
    // Seed two members; one active
    await db.collection('members').doc('u1').set({
      memberNo: 'INT-2025-000001',
      name: 'A',
      email: 'a@example.com',
      region: 'PRISHTINA',
    });
    await db.collection('members').doc('u2').set({
      memberNo: 'INT-2025-000002',
      name: 'B',
      email: 'b@example.com',
      region: 'PEJA',
    });
    const year = 2025;
    await db
      .collection('members')
      .doc('u1')
      .collection('memberships')
      .doc(String(year))
      .set({
        status: 'active',
        expiresAt: admin.firestore.Timestamp.fromDate(
          new Date(Date.now() + 86400000)
        ),
      });

    // Stub token verification to return admin role
    const auth = admin.auth();
    const verifyStub = (auth as any).verifyIdToken as (
      t: string
    ) => Promise<any>;
    (auth as any).verifyIdToken = async () => ({
      uid: 'admin',
      role: 'admin',
      mfaEnabled: true,
    });

    const { req, res, get, done } = makeReqRes('dummy');
    await (exportMembersCsv as any)(req, res);
    await done;
    const out = get();
    expect(out.statusCode).to.equal(200);
    expect(String(out.body)).to.include('memberNo,name,email');
    expect(String(out.body)).to.include('INT-2025-000001');
    expect(String(out.body)).to.include('yes');
  });
});
