import { expect } from 'chai';
import * as sinon from 'sinon';
import { agentCreateMemberLogic } from '../src/lib/agent';
import { admin, db } from '../src/firebaseAdmin';

describe('agentCreateMemberLogic', () => {
  afterEach(() => sinon.restore());

  it('denies when region not allowed for agent', async () => {
    const context: any = { auth: { uid: 'agent-1', token: { role: 'agent', allowedRegions: ['PRISHTINA'] } } };
    const data = { email: 'new@example.com', name: 'New User', region: 'PEJA', phone: '', orgId: '' };
    try {
      await agentCreateMemberLogic(data, context);
      throw new Error('should have thrown');
    } catch (e: any) {
      expect(e.code).to.equal('permission-denied');
    }
  });

  it('creates member for allowed region (stubs auth + tx)', async () => {
    const context: any = { auth: { uid: 'agent-1', token: { role: 'agent', allowedRegions: ['PRISHTINA'] } } };
    const data = { email: 'new@example.com', name: 'New User', region: 'PRISHTINA', phone: '', orgId: '' };

    // Stub Auth getUserByEmail -> throw (not found), then createUser -> returns record
    const authInstance: any = {
      getUserByEmail: sinon.stub().rejects(new Error('not found')),
      createUser: sinon.stub().resolves({ uid: 'uid-123', customClaims: {} }),
      setCustomUserClaims: sinon.stub().resolves(),
    };
    sinon.stub(admin, 'auth').returns(authInstance);

    // Fake transaction with get/set
    const fakeTx: any = {
      get: sinon.stub().resolves({ exists: false, get: (_: string) => undefined }),
      set: sinon.stub().returns(undefined),
    };
    sinon.stub(db, 'runTransaction').callsFake(async (fn: any) => { await fn(fakeTx); return undefined as any; });

    const res = await agentCreateMemberLogic(data, context);
    expect(res).to.deep.equal({ uid: 'uid-123' });
    expect(authInstance.createUser.calledOnce).to.be.true;
  });
});

