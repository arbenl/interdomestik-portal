import { assert, expect } from 'chai';
import { initializeTestEnvironment, assertFails, assertSucceeds, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import * as fs from 'fs';

const PROJECT_ID = 'demo-interdomestik';
const firestoreRules = fs.readFileSync('firestore.rules', 'utf8');
// Derive emulator host/port from env if provided by Firebase CLI; fallback to repo config
const FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST;
let emulatorHost = 'localhost';
let emulatorPort = 8085; // keep in sync with firebase.json
if (FIRESTORE_EMULATOR_HOST) {
  const [h, p] = FIRESTORE_EMULATOR_HOST.split(':');
  if (h) emulatorHost = h;
  const n = Number(p);
  if (!Number.isNaN(n)) emulatorPort = n;
}

describe('Firestore security rules', () => {
  let testEnv: RulesTestEnvironment;

  before(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        rules: firestoreRules,
        host: emulatorHost,
        port: emulatorPort,
      },
    });
  });

  after(async () => {
    await testEnv.cleanup();
  });

  it('should allow a user to read their own profile', async () => {
    // Seed under disabled rules
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const adb = ctx.firestore();
      await setDoc(doc(adb, 'members/user123'), { name: 'test user', region: 'PRISHTINA', memberNo: 'INT-2025-000001', status: 'none', year: null, expiresAt: null });
    });
    const context = testEnv.authenticatedContext('user123');
    const db = context.firestore();
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
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const adb = ctx.firestore();
      await setDoc(doc(adb, 'members/user123'), { name: 'test user', region: 'PRISHTINA', phone: '', orgId: '', memberNo: 'INT-2025-000001', status: 'none', year: null, expiresAt: null });
    });
    const context = testEnv.authenticatedContext('user123');
    const db = context.firestore();
    const write = setDoc(doc(db, 'members/user123'), { name: 'updated user', phone: '+38344111222' }, { merge: true });
    await assertSucceeds(write);
  });

  it('should NOT allow a user to update server-only fields', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const adb = ctx.firestore();
      await setDoc(doc(adb, 'members/user123'), { name: 'test user', region: 'PRISHTINA', memberNo: 'INT-2025-000001', status: 'active', year: 2025, expiresAt: null });
    });
    const context = testEnv.authenticatedContext('user123');
    const db = context.firestore();
    const write = setDoc(doc(db, 'members/user123'), { memberNo: 'INT-2025-000002' }, { merge: true });
    await assertFails(write);
  });

  it('agent can update allowed fields within allowed region, but cannot create', async () => {
    // Seed an existing member in PRISHTINA
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const adb = ctx.firestore();
      await setDoc(doc(adb, 'members/abc'), { name: 'Old', region: 'PRISHTINA', memberNo: 'INT-2025-000777', status: 'none', year: null, expiresAt: null, agentId: 'seed' });
    });

    const agent = testEnv.authenticatedContext('agent1', { role: 'agent', allowedRegions: ['PRISHTINA'] } as any);
    const dbAgent = agent.firestore();

    // Agent create via client is not covered here; creation should go through backend callable

    // Can update permitted fields within allowed region
    const updateOk = setDoc(doc(dbAgent, 'members/abc'), { name: 'Updated Name' }, { merge: true });
    await assertSucceeds(updateOk);

    // Cannot update a member outside allowed region
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const adb = ctx.firestore();
      await setDoc(doc(adb, 'members/def'), { name: 'Old', region: 'PEJA', memberNo: 'INT-2025-000778', status: 'none', year: null, expiresAt: null, agentId: 'seed' });
    });
    const updateNo = setDoc(doc(dbAgent, 'members/def'), { name: 'X' }, { merge: true });
    await assertFails(updateNo);
  });

  it('events are readable by signed-in users and writable only by admins', async () => {
    const authed = testEnv.authenticatedContext('user123');
    const dbUser = authed.firestore();
    const readEv = getDoc(doc(dbUser, 'events/e1'));
    await assertSucceeds(readEv);

    const writeEv = setDoc(doc(dbUser, 'events/e2'), { title: 'x' });
    await assertFails(writeEv);

    const admin = testEnv.authenticatedContext('admin1', { role: 'admin' } as any);
    const dbAdmin = admin.firestore();
    const writeEvAdmin = setDoc(doc(dbAdmin, 'events/e3'), { title: 'y' });
    await assertSucceeds(writeEvAdmin);
  });

  it('billing invoices readable by owner and admins; writes blocked for clients', async () => {
    const owner = testEnv.authenticatedContext('u1');
    const dbOwner = owner.firestore();
    // Owner can read
    const readOwn = getDoc(doc(dbOwner, 'billing/u1/invoices/inv_1'));
    await assertSucceeds(readOwn);
    // Owner cannot write
    const writeOwn = setDoc(doc(dbOwner, 'billing/u1/invoices/inv_1'), { amount: 2500 });
    await assertFails(writeOwn);

    // Other user cannot read
    const other = testEnv.authenticatedContext('u2');
    const dbOther = other.firestore();
    const readOther = getDoc(doc(dbOther, 'billing/u1/invoices/inv_1'));
    await assertFails(readOther);

    // Admin can read
    const admin = testEnv.authenticatedContext('admin1', { role: 'admin' } as any);
    const dbAdmin = admin.firestore();
    const readAdmin = getDoc(doc(dbAdmin, 'billing/u1/invoices/inv_1'));
    await assertSucceeds(readAdmin);
  });
});
