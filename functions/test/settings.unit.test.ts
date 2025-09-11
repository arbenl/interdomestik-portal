import { expect } from 'chai';
import { db } from '../src/firebaseAdmin';
import { setAutoRenewLogic } from '../src/lib/settings';

describe('settings: setAutoRenewLogic', () => {
  const uid = 'u_settings_' + Date.now();
  before(async () => {
    await db.collection('members').doc(uid).set({ email: 's@example.com' });
  });

  it('sets autoRenew for self user', async () => {
    const r = await setAutoRenewLogic(uid, undefined, true, false);
    expect(r.ok).to.equal(true);
    const d = await db.collection('members').doc(uid).get();
    expect(d.get('autoRenew')).to.equal(true);
  });

  it('admin can set autoRenew for another user', async () => {
    const r = await setAutoRenewLogic('admin', uid, false, true);
    expect(r.ok).to.equal(true);
    const d = await db.collection('members').doc(uid).get();
    expect(d.get('autoRenew')).to.equal(false);
  });
});

