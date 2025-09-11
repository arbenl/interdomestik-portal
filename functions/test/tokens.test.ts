import { expect } from 'chai';
import { signCardToken, verifyCardToken } from '../src/lib/tokens';

describe('tokens: sign/verify card token', () => {
  before(() => {
    process.env.CARD_JWT_SECRET = 'test-secret';
    delete process.env.CARD_JWT_SECRETS;
    delete process.env.CARD_JWT_ACTIVE_KID;
  });

  it('roundtrips mno and exp with default kid', () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const t = signCardToken({ mno: 'INT-2025-000001', exp });
    const c = verifyCardToken(t)!;
    expect(c).to.be.ok;
    expect(c.mno).to.equal('INT-2025-000001');
    expect(c.exp).to.equal(exp);
  });
});

