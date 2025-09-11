import { expect } from 'chai';
import { activateMembership } from '../src/lib/startMembership';
import { db } from '../src/firebaseAdmin';

describe('startMembership.activateMembership', () => {
  const uid = 'u_act_' + Date.now();
  const year = new Date().getUTCFullYear();
  before(async () => {
    await db.collection('members').doc(uid).set({ email: 'u@ex.com', name: 'U', region: 'PRISHTINA' });
  });

  it('activates a membership', async () => {
    const r = await activateMembership(uid, year, 25, 'EUR', 'cash', null);
    expect(r.refPath).to.contain(`/members/${uid}/memberships/${year}`);
    expect(r.alreadyActive).to.equal(false);
  });

  it('returns alreadyActive on second call', async () => {
    const r2 = await activateMembership(uid, year, 25, 'EUR', 'cash', null);
    expect(r2.alreadyActive).to.equal(true);
  });
});

