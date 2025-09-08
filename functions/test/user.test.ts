import { expect } from 'chai';
import * as sinon from 'sinon';
import { searchUserByEmailLogic, setUserRoleLogic } from '../src/lib/user';
import { admin } from '../src/firebaseAdmin';

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
});

