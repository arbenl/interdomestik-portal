import { expect } from 'chai';
import * as sinon from 'sinon';
import { updateMfaPreferenceLogic } from '../src/lib/security';
import { admin, db } from '../src/firebaseAdmin';

describe('security logic', () => {
  afterEach(() => sinon.restore());

  it('allows a user to mark their MFA status and preserves existing claims', async () => {
    const ctx = { auth: { uid: 'user-1', token: { role: 'agent' } } } as any;

    const authInstance = admin.auth();
    sinon.stub(authInstance, 'getUser').resolves({
      customClaims: {
        role: 'agent',
        allowedRegions: ['PRISHTINA'],
        mfaEnabled: false,
      },
    } as any);
    const setCustomClaims = sinon
      .stub(authInstance, 'setCustomUserClaims')
      .resolves();
    const revokeTokens = sinon
      .stub(authInstance, 'revokeRefreshTokens')
      .resolves();

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

    const res = await updateMfaPreferenceLogic({ enabled: true }, ctx);
    expect(res).to.deep.equal({ ok: true, uid: 'user-1', enabled: true });
    sinon.assert.calledWith(setCustomClaims, 'user-1', {
      role: 'agent',
      allowedRegions: ['PRISHTINA'],
      mfaEnabled: true,
    });
    sinon.assert.called(membersSet);
    sinon.assert.called(auditAdd);
    sinon.assert.calledWith(revokeTokens, 'user-1');
  });

  it('requires admin when updating other users', async () => {
    const ctx = { auth: { uid: 'agent-1', token: { role: 'agent' } } } as any;
    try {
      await updateMfaPreferenceLogic({ uid: 'member-2', enabled: true }, ctx);
      throw new Error('should have thrown');
    } catch (error: any) {
      expect(error.code).to.equal('permission-denied');
    }
  });

  it('validates payload', async () => {
    const ctx = { auth: { uid: 'user-1', token: { role: 'agent' } } } as any;
    try {
      await updateMfaPreferenceLogic({ enabled: 'yup' }, ctx as any);
      throw new Error('should have thrown');
    } catch (error: any) {
      expect(error.code).to.equal('invalid-argument');
    }
  });
});
