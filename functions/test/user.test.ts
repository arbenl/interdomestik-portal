import { expect } from 'chai';
import * as sinon from 'sinon';
import { searchUserByEmailLogic, setUserRoleLogic } from '../src/lib/user';
import { admin, db } from '../src/firebaseAdmin';

describe('user logic', () => {
  afterEach(() => sinon.restore());

  it('searchUserByEmailLogic returns uid for existing user', async () => {
    const authInstance = admin.auth();
    sinon.stub(authInstance, 'getUserByEmail').resolves({ uid: 'u123' } as any);
    const ctx = { auth: { uid: 'admin1', token: { role: 'admin' } } } as any;
    const res = await searchUserByEmailLogic({ email: 'x@example.com' }, ctx);
    expect(res).to.deep.equal({ uid: 'u123' });
  });

  it('searchUserByEmailLogic throws not-found for missing user', async () => {
    const authInstance = admin.auth();
    sinon.stub(authInstance, 'getUserByEmail').rejects(new Error('not found'));
    const ctx = { auth: { uid: 'admin1', token: { role: 'admin' } } } as any;
    try {
      await searchUserByEmailLogic({ email: 'absent@example.com' }, ctx);
      throw new Error('should have thrown');
    } catch (e: any) {
      expect(e.code).to.equal('not-found');
    }
  });

  it('setUserRoleLogic preserves existing custom claims such as mfaEnabled', async () => {
    const authInstance = admin.auth();
    sinon.stub(authInstance, 'getUser').resolves({ customClaims: { mfaEnabled: true, role: 'member' } } as any);
    const setCustomClaims = sinon.stub(authInstance, 'setCustomUserClaims').resolves();

    const membersSet = sinon.stub().resolves();
    const auditAdd = sinon.stub().resolves();
    sinon.stub(db, 'collection').callsFake((path: string) => {
      if (path === 'members') {
        return {
          doc: () => ({ set: membersSet }),
        } as any;
      }
      if (path === 'audit_logs') {
        return {
          add: auditAdd,
        } as any;
      }
      throw new Error(`Unexpected collection ${path}`);
    });

    const ctx = { auth: { uid: 'admin1', token: { role: 'admin' } } } as any;
    await setUserRoleLogic({ uid: 'user-42', role: 'agent', allowedRegions: ['PRISHTINA'] }, ctx);

    sinon.assert.calledWith(setCustomClaims, 'user-42', {
      mfaEnabled: true,
      role: 'agent',
      allowedRegions: ['PRISHTINA'],
    });
    sinon.assert.called(membersSet);
    sinon.assert.called(auditAdd);
  });
});
