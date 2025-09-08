import { expect } from 'chai';
import * as sinon from 'sinon';
import { upsertProfileLogic } from '../src/lib/upsertProfile';
import { setUserRoleLogic } from '../src/lib/user';
import * as startMembership from '../src/lib/startMembership';
import * as membership from '../src/lib/membership';
import { admin, db } from '../src/firebaseAdmin';

describe('Cloud Functions Logic', () => {
  let activateMembershipStub: sinon.SinonStub;
  let queueEmailStub: sinon.SinonStub;

  beforeEach(() => {
    activateMembershipStub = sinon
      .stub(startMembership, 'activateMembership')
      .resolves({ refPath: 'test/path', alreadyActive: false });
    queueEmailStub = sinon.stub(membership, 'queueEmail').resolves();
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('upsertProfileLogic', () => {
    it('should create a new profile', async () => {
      // Stub admin.auth().getUser and updateUser to resolve
      const authInstance = admin.auth();
      sinon.stub(authInstance, 'getUser').resolves({ uid: 'test-uid', email: 'test@example.com' } as any);
      sinon.stub(authInstance, 'updateUser').resolves({} as any);
      // Seed member doc to bypass memberNo generation (which mixes reads and writes)
      await db.collection('members').doc('test-uid').set({
        email: 'test@example.com', name: 'Test User', region: 'PRISHTINA', memberNo: 'INT-2025-000123'
      });
      const data = { name: 'Test User', phone: '+1234567890', region: 'PRISHTINA' };
      const context = { auth: { uid: 'test-uid', token: { email: 'test@example.com' } } };
      const result = await upsertProfileLogic(data, context as any);
      expect(result).to.deep.equal({ message: 'Profile updated successfully' });
    });

    it('rejects invalid input', async () => {
      const data = { name: '', phone: 'x', region: '' }; // fails zod validation
      const context = { auth: { uid: 'test-uid' } } as any;
      try {
        await upsertProfileLogic(data, context);
        throw new Error('should have thrown');
      } catch (e: any) {
        expect(e.code).to.equal('invalid-argument');
      }
    });
  });

  describe('setUserRoleLogic', () => {
    it('should set a user role', async () => {
      const authInstance = admin.auth();
      sinon.stub(authInstance, 'setCustomUserClaims').resolves();
      const data = { uid: 'test-uid', role: 'admin', allowedRegions: ['PRISHTINA'] };
      const context = { auth: { uid: 'admin-uid', token: { role: 'admin' } } };
      const result = await setUserRoleLogic(data, context as any);
      expect(result).to.deep.equal({ message: 'User role updated successfully' });
    });
  });

  describe('startMembershipLogic', () => {
    it('should start a new membership', async () => {
      // Seed a minimal member doc used by the logic
      await db.collection('members').doc('test-uid').set({
        email: 'member@example.com',
        name: 'Member One',
        region: 'PRISHTINA',
        memberNo: 'INT-2025-009999',
      });
      const data = { uid: 'test-uid', year: 2025, price: 10, currency: 'EUR', paymentMethod: 'cash', externalRef: null };
      const context = { auth: { uid: 'admin-uid', token: { role: 'admin' } } };
      const result = await startMembership.startMembershipLogic(data, context as any);
      expect(result.message).to.equal('Membership started successfully');
    });
  });
});
