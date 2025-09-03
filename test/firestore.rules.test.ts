import { assert, expect } from 'chai';
import { initializeTestEnvironment, assertFails, assertSucceeds, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import * as fs from 'fs';

const PROJECT_ID = 'demo-interdomestik';
const firestoreRules = fs.readFileSync('firestore.rules', 'utf8');

describe('Firestore security rules', () => {
  let testEnv: RulesTestEnvironment;

  before(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        rules: firestoreRules,
        host: 'localhost',
        port: 8080,
      },
    });
  });

  after(async () => {
    await testEnv.cleanup();
  });

  it('should allow a user to read their own profile', async () => {
    const context = testEnv.authenticatedContext('user123');
    const db = context.firestore();
    await setDoc(doc(db, 'members/user123'), { name: 'test user' });
    const readDoc = getDoc(doc(db, 'members/user123'));
    await assertSucceeds(readDoc);
  });

  it('should not allow a user to read another user\'s profile', async () => {
    const context = testEnv.authenticatedContext('user123');
    const db = context.firestore();
    const readDoc = getDoc(doc(db, 'members/user456'));
    await assertFails(readDoc);
  });

  it('should allow a user to update allowed fields on their own profile', async () => {
    const context = testEnv.authenticatedContext('user123');
    const db = context.firestore();
    await setDoc(doc(db, 'members/user123'), { name: 'test user', region: 'PRISHTINA' });
    const write = setDoc(doc(db, 'members/user123'), { name: 'updated user', phone: '+38344111222' }, { merge: true });
    await assertSucceeds(write);
  });

  it('should NOT allow a user to update server-only fields', async () => {
    const context = testEnv.authenticatedContext('user123');
    const db = context.firestore();
    await setDoc(doc(db, 'members/user123'), { name: 'test user', memberNo: 'INT-2025-000001', status: 'active' });
    const write = setDoc(doc(db, 'members/user123'), { memberNo: 'INT-2025-000002' }, { merge: true });
    await assertFails(write);
  });

  it('allows agent create only for allowed region', async () => {
    const agent = testEnv.authenticatedContext('agent1', { role: 'agent', allowedRegions: ['PRISHTINA'] } as any);
    const dbAgent = agent.firestore();

    // Allowed region
    const createOk = setDoc(doc(dbAgent, 'members/abc'), { name: 'X', region: 'PRISHTINA' });
    await assertSucceeds(createOk);

    // Disallowed region
    const createNo = setDoc(doc(dbAgent, 'members/def'), { name: 'Y', region: 'PEJA' });
    await assertFails(createNo);
  });
});
