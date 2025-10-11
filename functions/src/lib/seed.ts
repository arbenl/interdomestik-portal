import { admin, db } from '../firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';
import * as functions from 'firebase-functions/v1';
import { log } from './logger';
import { activateMembership } from './startMembership';

export const seedDatabaseLogic = async (
  req: functions.https.Request,
  res: functions.Response
) => {
  try {
    // CORS for local tools
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }

    const ensureUser = async (createRequest: admin.auth.CreateRequest) => {
      const { email } = createRequest;
      if (!email) throw new Error('User email is required for seeding');
      try {
        return await admin.auth().createUser(createRequest);
      } catch (err: any) {
        if (err.code === 'auth/email-already-exists') {
          const existing = await admin.auth().getUserByEmail(email);
          const updates: admin.auth.UpdateRequest = {};
          if (
            createRequest.displayName &&
            existing.displayName !== createRequest.displayName
          ) {
            updates.displayName = createRequest.displayName;
          }
          if (createRequest.emailVerified && !existing.emailVerified) {
            updates.emailVerified = true;
          }
          if (Object.keys(updates).length > 0) {
            await admin.auth().updateUser(existing.uid, updates);
          }
          return existing;
        }
        throw err;
      }
    };

    const upsertMember = async (uid: string, data: Record<string, unknown>) => {
      const ref = db.collection('members').doc(uid);
      const snapshot = await ref.get();
      const createdAt =
        snapshot.exists && snapshot.get('createdAt')
          ? snapshot.get('createdAt')
          : Timestamp.now();
      await ref.set(
        {
          createdAt,
          updatedAt: Timestamp.now(),
          ...data,
        },
        { merge: true }
      );
    };

    // Create two member accounts
    const member1 = await ensureUser({
      email: 'member1@example.com',
      password: 'password123',
      displayName: 'Member One',
      emailVerified: true,
    });
    await upsertMember(member1.uid, {
      name: 'Member One',
      email: 'member1@example.com',
      memberNo: 'INT-2025-000001',
      region: 'PRISHTINA',
      role: 'member',
    });
    await db
      .collection('members')
      .doc(member1.uid)
      .collection('memberships')
      .doc('2025')
      .set({
        year: 2025,
        status: 'active',
        startedAt: Timestamp.fromDate(new Date('2025-01-01')),
        expiresAt: Timestamp.fromDate(new Date('2025-12-31')),
        price: 100,
        currency: 'EUR',
        paymentMethod: 'cash',
        externalRef: null,
        updatedAt: Timestamp.now(),
      });

    const member2 = await ensureUser({
      email: 'member2@example.com',
      password: 'password123',
      displayName: 'Member Two',
      emailVerified: true,
    });
    await upsertMember(member2.uid, {
      name: 'Member Two',
      email: 'member2@example.com',
      memberNo: 'INT-2025-000002',
      region: 'PEJA',
      role: 'member',
    });

    // Create an admin for admin-screen testing
    const adminUser = await ensureUser({
      email: 'admin@example.com',
      password: 'password123',
      displayName: 'Admin User',
      emailVerified: true,
    });
    await admin.auth().setCustomUserClaims(adminUser.uid, {
      ...(adminUser.customClaims || {}),
      role: 'admin',
      allowedRegions: ['PRISHTINA', 'PEJA'],
      mfaEnabled: true,
    });
    await upsertMember(adminUser.uid, {
      name: 'Admin User',
      email: 'admin@example.com',
      memberNo: 'INT-2025-999999',
      region: 'PRISHTINA',
      role: 'admin',
    });

    // Create several agents for testing agent ownership flows
    const agentDefs = [
      {
        email: 'agent1@example.com',
        regions: ['PRISHTINA', 'FERIZAJ'],
        name: 'Agent One',
      },
      {
        email: 'agent2@example.com',
        regions: ['PEJA', 'PRIZREN'],
        name: 'Agent Two',
      },
      {
        email: 'agent3@example.com',
        regions: ['GJAKOVA', 'GJILAN', 'MITROVICA'],
        name: 'Agent Three',
      },
    ] as const;
    const agents: Array<{ uid: string; email: string; regions: string[] }> = [];
    for (const a of agentDefs) {
      const u = await ensureUser({
        email: a.email,
        password: 'password123',
        displayName: a.name,
        emailVerified: true,
      });
      await admin.auth().setCustomUserClaims(u.uid, {
        ...(u.customClaims || {}),
        role: 'agent',
        allowedRegions: a.regions,
      });
      await upsertMember(u.uid, {
        name: a.name,
        email: a.email,
        memberNo: `INT-2025-A${Math.floor(Math.random() * 900 + 100)}`,
        region: a.regions[0],
        role: 'agent',
      });
      agents.push({
        uid: u.uid,
        email: a.email,
        regions: a.regions as unknown as string[],
      });
    }

    // Seed a couple of events
    await db.collection('events').add({
      title: 'Welcome meetup — PRISHTINA',
      startAt: Timestamp.fromDate(new Date(Date.now() + 7 * 86400000)),
      location: 'PRISHTINA',
      focus: 'Orientation • Region onboarding',
      tags: ['meetup'],
      regions: ['PRISHTINA'],
      createdAt: Timestamp.now(),
    });
    await db.collection('events').add({
      title: 'Volunteer day',
      startAt: Timestamp.fromDate(new Date(Date.now() + 21 * 86400000)),
      location: 'PEJA',
      focus: 'Community projects • Outreach planning',
      tags: ['workshop'],
      regions: ['PEJA'],
      createdAt: Timestamp.now(),
    });

    // Bulk-create seed members distributed across regions and agents
    const regions = [
      'PRISHTINA',
      'PRIZREN',
      'GJAKOVA',
      'PEJA',
      'FERIZAJ',
      'GJILAN',
      'MITROVICA',
    ] as const;
    const regionToAgentUid = new Map<string, string>();
    for (const a of agents) {
      for (const r of a.regions) regionToAgentUid.set(r, a.uid);
    }
    const yearNow = new Date().getUTCFullYear();
    const total = 60;
    for (let i = 1; i <= total; i++) {
      const seq = String(100 + i).padStart(6, '0');
      const name = `Seed Member ${String(i).padStart(2, '0')}`;
      const email = `seed${String(i).padStart(3, '0')}@example.com`;
      const region = regions[(i - 1) % regions.length];
      const agentUid = regionToAgentUid.get(region);
      const user = await ensureUser({
        email,
        password: 'password123',
        displayName: name,
        emailVerified: true,
      });
      const memberNo = `INT-${yearNow}-${seq}`;
      const createdAt = Timestamp.fromDate(new Date(Date.now() - i * 864000));
      await db
        .collection('members')
        .doc(user.uid)
        .set(
          {
            name,
            nameLower: name.toLowerCase(),
            email,
            region,
            phone: `+38349${String(100000 + i).slice(0, 6)}`,
            memberNo,
            agentId: agentUid || null,
            status: 'none',
            year: null,
            expiresAt: null,
            createdAt,
            updatedAt: createdAt,
          },
          { merge: true }
        );
      // Activate current or previous year randomly (roughly 70% current)
      const activeThisYear = i % 10 !== 0 && i % 3 !== 0; // skip for some variety
      if (activeThisYear) {
        await activateMembership(user.uid, yearNow, 25, 'EUR', 'cash', null);
      } else {
        await activateMembership(
          user.uid,
          yearNow - 1,
          25,
          'EUR',
          'cash',
          null
        );
        // Mark root doc as expired for clarity in UI
        await db
          .collection('members')
          .doc(user.uid)
          .set({ status: 'expired' }, { merge: true });
      }
    }

    res.status(200).json({
      ok: true,
      seeded: [
        'member1@example.com',
        'member2@example.com',
        'admin@example.com',
      ],
      agents: agents.map((a) => a.email),
      members: total,
    });
  } catch (error: unknown) {
    log('seed_error', { error: String(error) });
    if (error instanceof Error) {
      res.status(500).send(`Error seeding database: ${error.message}`);
    } else {
      res
        .status(500)
        .send('An unknown error occurred during database seeding.');
    }
  }
};
