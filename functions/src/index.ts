import * as functions from "firebase-functions/v1";
import { Timestamp } from 'firebase-admin/firestore';
import { admin, db } from "./firebaseAdmin";
import { upsertProfileLogic } from "./lib/upsertProfile";
import { setUserRoleLogic, searchUserByEmailLogic } from "./lib/user";
import { startMembershipLogic } from "./lib/startMembership";
import { agentCreateMemberLogic } from "./lib/agent";
import { sendRenewalReminder } from "./lib/membership";
export { exportMembersCsv } from './exportMembersCsv';

// Region constant for consistency
const REGION = "europe-west1" as const;

// Callable functions ---------------------------------------------------------
export const upsertProfile = functions
  .region(REGION)
  .https.onCall((data, context) => upsertProfileLogic(data, context));

export const setUserRole = functions
  .region(REGION)
  .https.onCall((data, context) => setUserRoleLogic(data, context));

export const startMembership = functions
  .region(REGION)
  .https.onCall((data, context) => startMembershipLogic(data, context));

export const searchUserByEmail = functions
  .region(REGION)
  .https.onCall((data, context) => searchUserByEmailLogic(data, context));

export const agentCreateMember = functions
  .region(REGION)
  .https.onCall((data, context) => agentCreateMemberLogic(data, context));

// HTTP utilities -------------------------------------------------------------
export const clearDatabase = functions
  .region(REGION)
  .https.onRequest(async (req, res): Promise<void> => {
    try {
      // CORS for local tools
      res.set("Access-Control-Allow-Origin", "*");
      res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.set("Access-Control-Allow-Headers", "Content-Type");
      if (req.method === 'OPTIONS') { res.status(204).end(); return; }

      const auth = admin.auth();
      const listUsersResult = await auth.listUsers();
      await Promise.all(listUsersResult.users.map((user) => auth.deleteUser(user.uid)));

      const membersSnapshot = await db.collection('members').get();
      await Promise.all(membersSnapshot.docs.map((d) => d.ref.delete()));

      res.status(200).send('Database cleared successfully.');
    } catch (error: unknown) {
      console.error('Error clearing database:', error);
      if (error instanceof Error) res.status(500).send(`Error clearing database: ${error.message}`);
      else res.status(500).send('An unknown error occurred during database clearing.');
    }
  });

export const verifyMembership = functions
  .region(REGION)
  .https.onRequest(async (req: functions.https.Request, res: functions.Response): Promise<void> => {
    // Basic CORS for GET
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") {
      res.status(200).send("ok");
      return;
    }
    if (req.method !== "GET") {
      res.status(405).json({ ok: false, error: "Method not allowed" });
      return;
    }

    try {
      const memberNoRaw = req.query.memberNo;
      const memberNo = String(memberNoRaw ?? "").trim();

      if (!memberNo) {
        res.status(400).json({ ok: false, error: "memberNo required" });
        return;
      }

      if (!/^INT-\d{4}-\d{6}$/.test(memberNo)) {
        res.json({ ok: true, valid: false, memberNo });
        return;
      }

      const q = await db
        .collection("members")
        .where("memberNo", "==", memberNo)
        .limit(1)
        .get();

      if (q.empty) {
        res.json({ ok: true, valid: false, memberNo });
        return;
      }

      const doc = q.docs[0];
      const activeSnap = await db
        .collection("members")
        .doc(doc.id)
        .collection("memberships")
        .where("status", "==", "active")
        .where("expiresAt", ">", Timestamp.now())
        .limit(1)
        .get();

      res.json({
        ok: true,
        valid: !activeSnap.empty,
        memberNo,
        name: (doc.get("name") as string) || "Member",
        region: (doc.get("region") as string) || "—",
      });
      return;
    } catch (e) {
      res.status(500).json({ ok: false, error: String(e) });
      return;
    }
  });

// Stripe webhook (emulator-friendly placeholder). In production, add signature verification.
export const stripeWebhook = functions
  .region(REGION)
  .https.onRequest(async (req, res): Promise<void> => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Stripe-Signature');
    if (req.method === 'OPTIONS') { res.status(204).end(); return; }
    if (req.method !== 'POST') { res.status(405).send('Method not allowed'); return; }
    try {
      const body = req.body || {};
      // Expect { uid, invoiceId, amount, currency, created }
      const uid = String(body.uid || '');
      if (!uid) { res.status(400).send('uid required'); return; }
      const invoiceId = String(body.invoiceId || `inv_${Date.now()}`);
      const amount = Number(body.amount || 0);
      const currency = String(body.currency || 'EUR');
      const created = body.created ? Timestamp.fromDate(new Date(body.created)) : Timestamp.now();
      await db.collection('billing').doc(uid).collection('invoices').doc(invoiceId).set({
        invoiceId, amount, currency, created,
        status: 'paid',
      }, { merge: true });
      res.json({ ok: true });
    } catch (e) {
      console.error('[stripeWebhook] error', e);
      res.status(500).json({ ok: false, error: String(e) });
    }
  });

if (process.env.FUNCTIONS_EMULATOR) {
  // Export a seed function only in emulator mode
  exports.seedDatabase = functions.region(REGION).https.onRequest(async (req, res) => {
    try {
      // CORS for local tools
      res.set("Access-Control-Allow-Origin", "*");
      res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.set("Access-Control-Allow-Headers", "Content-Type");
      if (req.method === 'OPTIONS') { res.status(204).end(); return; }

      // Create two member accounts
      const member1 = await admin.auth().createUser({
        email: 'member1@example.com',
        password: 'password123',
        displayName: 'Member One',
        emailVerified: true,
      });
      await db.collection('members').doc(member1.uid).set({
        name: 'Member One',
        email: 'member1@example.com',
        memberNo: 'INT-2025-000001',
        region: 'PRISHTINA',
        role: 'member',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      await db.collection('members').doc(member1.uid).collection('memberships').doc('2025').set({
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

      const member2 = await admin.auth().createUser({
        email: 'member2@example.com',
        password: 'password123',
        displayName: 'Member Two',
        emailVerified: true,
      });
      await db.collection('members').doc(member2.uid).set({
        name: 'Member Two',
        email: 'member2@example.com',
        memberNo: 'INT-2025-000002',
        region: 'PEJA',
        role: 'member',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      // Create an admin for admin-screen testing
      const adminUser = await admin.auth().createUser({
        email: 'admin@example.com',
        password: 'password123',
        displayName: 'Admin User',
        emailVerified: true,
      });
      await admin.auth().setCustomUserClaims(adminUser.uid, { role: 'admin', allowedRegions: ['PRISHTINA', 'PEJA'] });
      await db.collection('members').doc(adminUser.uid).set({
        name: 'Admin User',
        email: 'admin@example.com',
        memberNo: 'INT-2025-999999',
        region: 'PRISHTINA',
        role: 'admin',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      // Seed a couple of events
      await db.collection('events').add({
        title: 'Welcome meetup — PRISHTINA',
        startAt: Timestamp.fromDate(new Date(Date.now() + 7 * 86400000)),
        location: 'PRISHTINA',
        createdAt: Timestamp.now(),
      });
      await db.collection('events').add({
        title: 'Volunteer day',
        startAt: Timestamp.fromDate(new Date(Date.now() + 21 * 86400000)),
        location: 'PEJA',
        createdAt: Timestamp.now(),
      });

      res.status(200).json({ ok: true, seeded: ['member1@example.com', 'member2@example.com', 'admin@example.com'] });
    } catch (error: unknown) {
      console.error('Error seeding database:', error);
      if (error instanceof Error) {
        res.status(500).send(`Error seeding database: ${error.message}`);
      } else {
        res.status(500).send('An unknown error occurred during database seeding.');
      }
    }
  });
}

// Scheduled renewal reminders at ~03:00 UTC daily
export const dailyRenewalReminders = functions
  .region(REGION)
  .pubsub.schedule('0 3 * * *')
  .timeZone('UTC')
  .onRun(async () => {
    const now = admin.firestore.Timestamp.now();
    const today = now.toDate();

    async function runForOffset(days: number) {
      const target = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + days));
      const start = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), target.getUTCDate(), 0, 0, 0));
      const end = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), target.getUTCDate(), 23, 59, 59));
      const startTs = admin.firestore.Timestamp.fromDate(start);
      const endTs = admin.firestore.Timestamp.fromDate(end);

      const q = await db.collection('members')
        .where('expiresAt', '>=', startTs)
        .where('expiresAt', '<=', endTs)
        .get();
      for (const d of q.docs) {
        const email = d.get('email') as string | undefined;
        const name = (d.get('name') as string) || 'Member';
        const memberNo = d.get('memberNo') as string;
        if (!email || !memberNo) continue;
        const expiresAt = d.get('expiresAt') as admin.firestore.Timestamp;
        const expiresOn = expiresAt.toDate().toISOString().slice(0, 10);
        await sendRenewalReminder({ email, name, memberNo, expiresOn });
      }
    }

    await Promise.all([runForOffset(30), runForOffset(7), runForOffset(1)]);
  });

//       if (q.empty) {
//         res.json({ ok: true, valid: false, memberNo });
//         return;
//       }

//       const doc = q.docs[0];
//       // Check any active (unexpired) membership
//       const activeSnap = await admin.firestore()
//         .collection("members")
//         .doc(doc.id)
//         .collection("memberships")
//         .where("status", "==", "active")
//         .where("expiresAt", ">", admin.firestore.Timestamp.now())
//         .limit(1)
//         .get();

//       res.json({
//         ok: true,
//         valid: !activeSnap.empty,
//         memberNo,
//         name: (doc.get("name") as string) || "Member",
//         region: (doc.get("region") as string) || "—",
//       });
//       return;
//     } catch (e) {
//       res.status(500).json({ ok: false, error: String(e) });
//       return;
//     }
//   });
