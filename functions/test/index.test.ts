import { expect } from 'chai';
import * as sinon from 'sinon';
import { upsertProfileLogic } from '../src/lib/upsertProfile';
import { setUserRoleLogic } from '../src/lib/user';
import * as startMembership from '../src/lib/startMembership';
import * as membership from '../src/lib/membership';

describe('Cloud Functions Logic', () => {
  let activateMembershipStub: sinon.SinonStub;
  let queueEmailStub: sinon.SinonStub;

  beforeEach(() => {
    activateMembershipStub = sinon.stub(startMembership, 'activateMembership').resolves({ refPath: 'test/path' });
    queueEmailStub = sinon.stub(membership, 'queueEmail').resolves();
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('upsertProfileLogic', () => {
    it('should create a new profile', async () => {
      const data = { name: 'Test User', phone: '+1234567890', region: 'PRISHTINA' };
      const context = { auth: { uid: 'test-uid' } };
      const result = await upsertProfileLogic(data, context as any);
      expect(result).to.deep.equal({ message: 'Profile updated successfully' });
    });
  });

  describe('setUserRoleLogic', () => {
    it('should set a user role', async () => {
      const data = { uid: 'test-uid', role: 'admin', allowedRegions: ['PRISHTINA'] };
      const context = { auth: { uid: 'admin-uid', token: { role: 'admin' } } };
      const result = await setUserRoleLogic(data, context as any);
      expect(result).to.deep.equal({ message: 'User role updated successfully' });
    });
  });

  describe('startMembershipLogic', () => {
    it('should start a new membership', async () => {
      const data = { uid: 'test-uid', year: 2025, price: 10, currency: 'EUR', paymentMethod: 'cash', externalRef: null };
      const context = { auth: { uid: 'admin-uid', token: { role: 'admin' } } };
      const result = await startMembership.startMembershipLogic(data, context as any);
      expect(result.message).to.equal('Membership started successfully');
    });
  });
});
