import * as functions from "firebase-functions/v1";
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { admin, db } from "./firebaseAdmin";
import { upsertProfileLogic } from "./lib/upsertProfile";
import { setUserRoleLogic, searchUserByEmailLogic, getUserClaimsLogic } from "./lib/user";
import { importMembersCsvLogic } from './lib/importCsv';
import { backfillNameLowerLogic } from './lib/backfill';
import { startMembershipLogic } from "./lib/startMembership";
import { agentCreateMemberLogic } from "./lib/agent";
import { sendRenewalReminder, membershipCardHtml, queueEmail, sendPaymentReceipt } from "./lib/membership";
import { activateMembership } from './lib/startMembership';
import { cleanupOldAuditLogs, cleanupOldMetrics } from './lib/cleanup';
import { createPaymentIntentLogic } from './lib/payments';
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

export const getUserClaims = functions
  .region(REGION)
  .https.onCall((data, context) => getUserClaimsLogic(data, context));

export const importMembersCsv = functions
  .region(REGION)
  .https.onCall((data, context) => importMembersCsvLogic(data, context));

export const backfillNameLower = functions
  .region(REGION)
  .https.onCall((data, context) => backfillNameLowerLogic(data, context));

export const createPaymentIntent = functions
  .region(REGION)
  .https.onCall((data, context) => createPaymentIntentLogic(data as any, context));
// Resend digital membership card email to the authenticated user (or admin-specified uid)
export const resendMembershipCard = functions
  .region(REGION)
  .https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Sign in required');
    const requestedUid = String((data?.uid ?? '').toString().trim());
    const actorUid = context.auth.uid;
    const isAdmin = (context.auth.token as any)?.role === 'admin';
    const uid = requestedUid && isAdmin ? requestedUid : actorUid;

    const memberDoc = await db.collection('members').doc(uid).get();
    if (!memberDoc.exists) throw new functions.https.HttpsError('not-found', 'Member not found');
    const memberNo = memberDoc.get('memberNo') as string | undefined;
    const name = (memberDoc.get('name') as string | undefined) || 'Member';
    const region = (memberDoc.get('region') as string | undefined) || '—';
    const email = (memberDoc.get('email') as string | undefined) || undefined;
    if (!email || !memberNo) throw new functions.https.HttpsError('failed-precondition', 'Member profile missing email or memberNo');

    // Determine active year (prefer explicit year from input, else latest active doc)
    const explicitYear = Number.isFinite(Number(data?.year)) ? Number(data?.year) : undefined;
    let yearToUse: number | undefined = explicitYear;
    if (!yearToUse) {
      const act = await db.collection('members').doc(uid).collection('memberships')
        .where('status', '==', 'active').orderBy('year', 'desc').limit(1).get();
      if (!act.empty) yearToUse = Number(act.docs[0].get('year'));
    }
    if (!yearToUse) throw new functions.https.HttpsError('failed-precondition', 'No active membership to resend');

    const verifyUrl = `https://interdomestik.app/verify?memberNo=${encodeURIComponent(memberNo)}`;
    const html = membershipCardHtml({ memberNo, name, region, validity: String(yearToUse), verifyUrl });
    await queueEmail({ to: [email], subject: `Interdomestik Membership ${yearToUse}`, html });

    try {
      await db.collection('audit_logs').add({
        action: 'resendMembershipCard',
        actor: actorUid,
        target: uid,
        year: yearToUse,
        ts: FieldValue.serverTimestamp(),
      });
    } catch {}
    return { ok: true };
  });

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
      // Simple IP-based rate limiting (skips emulator). Limits: 60/minute or 1000/day
      const isEmu = process.env.FUNCTIONS_EMULATOR || process.env.FIREBASE_EMULATOR_HUB;
      if (!isEmu) {
        const fwd = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
        const ip = fwd || (req as any).ip || (req.socket && (req.socket as any).remoteAddress) || 'unknown';
        const crypto = await import('crypto');
        const hash = crypto.createHash('sha256').update(String(ip)).digest('hex').slice(0, 12);
        const now = new Date();
        const dayKey = `${now.getUTCFullYear()}${String(now.getUTCMonth()+1).padStart(2,'0')}${String(now.getUTCDate()).padStart(2,'0')}`;
        const minuteKey = Math.floor(now.getTime() / 60000); // epoch minute
        const ref = db.collection('ratelimit_verify').doc(`${dayKey}-${hash}`);
        let limited = false;
        await db.runTransaction(async (tx) => {
          const snap = await tx.get(ref);
          const data = snap.exists ? snap.data() as any : {};
          const prevMinuteKey = Number(data.minuteKey || 0);
          const prevMinuteCount = Number(data.minuteCount || 0);
          const prevDayCount = Number(data.dayCount || 0);
          const minuteCount = (prevMinuteKey === minuteKey) ? (prevMinuteCount + 1) : 1;
          const dayCount = prevDayCount + 1;
          if (minuteCount > 60 || dayCount > 1000) {
            limited = true;
          }
          tx.set(ref, {
            minuteKey,
            minuteCount,
            dayCount,
            updatedAt: FieldValue.serverTimestamp(),
          }, { merge: true });
        });
        if (limited) {
          res.status(429).json({ ok: false, error: 'Too many requests' });
          return;
        }
      }

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
      const signingSecret = process.env.STRIPE_SIGNING_SECRET;
      const sig = (req as any)?.headers ? ((req as any).headers['stripe-signature'] as string | undefined) : undefined;
      const isStripeMode = !!(signingSecret && sig);

      if (isStripeMode) {
        // Verify signature and construct event
        // Indirect dynamic import to avoid hard dependency in test/emulator without package
        const Stripe = (await (Function('m', 'return import(m)') as any)('stripe')).default;
        const stripe = new Stripe(process.env.STRIPE_API_KEY || '', { apiVersion: '2024-06-20' as any });
        let event: any;
        try {
          event = stripe.webhooks.constructEvent(req.rawBody, sig!, signingSecret!);
        } catch (err) {
          console.error('[stripeWebhook] signature verification failed', err);
          res.status(400).send(`Webhook Error: ${(err as Error).message}`);
          return;
        }

        // Idempotency: skip if processed
        const eventDoc = db.collection('webhooks_stripe').doc(event.id);
        const already = await eventDoc.get();
        if (already.exists && already.get('processed')) {
          res.json({ ok: true, duplicate: true });
          return;
        }

        if (event.type === 'invoice.payment_succeeded') {
          const inv = event.data.object as any;
          const uid: string | undefined = inv.metadata?.uid;
          if (!uid) { res.status(400).send('metadata.uid missing'); return; }
          const invoiceId: string = inv.id || `inv_${Date.now()}`;
          const amount: number = Number(inv.amount_paid || inv.amount_due || 0);
          const currency: string = (inv.currency || 'eur').toUpperCase();
          const created: Timestamp = Timestamp.fromMillis((inv.created || Math.floor(Date.now()/1000)) * 1000);
          await db.runTransaction(async (tx) => {
            const invRef = db.collection('billing').doc(uid).collection('invoices').doc(invoiceId);
            tx.set(invRef, { invoiceId, amount, currency, created, status: 'paid' }, { merge: true });
            tx.set(eventDoc, { processed: true, type: event.type, at: FieldValue.serverTimestamp() }, { merge: true });
          });
          // Activate membership for current (or configured) year
          const envYear = Number(process.env.MEMBER_YEAR);
          const year = (!Number.isNaN(envYear) && envYear >= 2020 && envYear <= 2100)
            ? envYear
            : new Date().getUTCFullYear();
          try {
            await activateMembership(uid, year, amount / 100, currency, 'card', invoiceId);
            // Send card + receipt emails
            try {
              const m = await db.collection('members').doc(uid).get();
              const email = (m.get('email') as string | undefined);
              const name = (m.get('name') as string | undefined) || 'Member';
              const memberNo = m.get('memberNo') as string | undefined;
              const region = (m.get('region') as string | undefined) || '—';
              if (email && memberNo) {
                const verifyUrl = `https://interdomestik.app/verify?memberNo=${encodeURIComponent(memberNo)}`;
                const html = membershipCardHtml({ memberNo, name, region, validity: String(year), verifyUrl });
                await queueEmail({ to: [email], subject: `Interdomestik Membership ${year}`, html });
                await sendPaymentReceipt({ email, name, memberNo, amount: amount / 100, currency, method: 'card', reference: invoiceId });
              }
            } catch (e) {
              console.warn('[stripeWebhook] email dispatch failed', e);
            }
            // Minimal audit and metrics handled inside startMembership logic normally; here we emulate key parts
            await db.collection('audit_logs').add({
              action: 'startMembership',
              actor: 'stripe-webhook',
              target: uid,
              year,
              amount: amount / 100,
              currency,
              method: 'card',
              ts: FieldValue.serverTimestamp(),
            });
          } catch (e) {
            console.warn('[stripeWebhook] activateMembership failed', e);
          }
          res.json({ ok: true });
          return;
        }

        // Unhandled event types acknowledged
        await eventDoc.set({ processed: true, type: event.type, at: FieldValue.serverTimestamp() }, { merge: true });
        res.json({ ok: true, ignored: true, type: event.type });
        return;
      }

      // Emulator-friendly JSON fallback
      const body = req.body || {};
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
      // Emulator path: also activate membership directly
      try {
        const envYear = Number(process.env.MEMBER_YEAR);
        const year = (!Number.isNaN(envYear) && envYear >= 2020 && envYear <= 2100)
          ? envYear
          : new Date().getUTCFullYear();
        await activateMembership(uid, year, amount / 100, currency, 'card', invoiceId);
        // Also send the membership card email in emulator mode for end-to-end UX
        try {
          const m = await db.collection('members').doc(uid).get();
          const email = (m.get('email') as string | undefined);
          const name = (m.get('name') as string | undefined) || 'Member';
          const memberNo = m.get('memberNo') as string | undefined;
          const region = (m.get('region') as string | undefined) || '—';
          if (email && memberNo) {
            const verifyUrl = `https://interdomestik.app/verify?memberNo=${encodeURIComponent(memberNo)}`;
            const html = membershipCardHtml({ memberNo, name, region, validity: String(year), verifyUrl });
            await queueEmail({ to: [email], subject: `Interdomestik Membership ${year}`, html });
            await sendPaymentReceipt({ email, name, memberNo, amount: amount / 100, currency, method: 'card', reference: invoiceId });
          }
        } catch (e) {
          console.warn('[stripeWebhook][emu] email dispatch failed', e);
        }
      } catch (e) {
        console.warn('[stripeWebhook][emu] activateMembership failed', e);
      }
      res.json({ ok: true, mode: 'emulator' });
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

      // Create several agents for testing agent ownership flows
      const agentDefs = [
        { email: 'agent1@example.com', regions: ['PRISHTINA', 'FERIZAJ'], name: 'Agent One' },
        { email: 'agent2@example.com', regions: ['PEJA', 'PRIZREN'], name: 'Agent Two' },
        { email: 'agent3@example.com', regions: ['GJAKOVA', 'GJILAN', 'MITROVICA'], name: 'Agent Three' },
      ] as const;
      const agents: Array<{ uid: string; email: string; regions: string[] }> = [];
      for (const a of agentDefs) {
        const u = await admin.auth().createUser({ email: a.email, password: 'password123', displayName: a.name, emailVerified: true });
        await admin.auth().setCustomUserClaims(u.uid, { role: 'agent', allowedRegions: a.regions });
        await db.collection('members').doc(u.uid).set({
          name: a.name,
          email: a.email,
          memberNo: `INT-2025-A${Math.floor(Math.random()*900+100)}`,
          region: a.regions[0],
          role: 'agent',
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
        agents.push({ uid: u.uid, email: a.email, regions: a.regions as unknown as string[] });
      }

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

      // Bulk-create seed members distributed across regions and agents
      const regions = ['PRISHTINA', 'PRIZREN', 'GJAKOVA', 'PEJA', 'FERIZAJ', 'GJILAN', 'MITROVICA'] as const;
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
        const user = await admin.auth().createUser({ email, password: 'password123', displayName: name, emailVerified: true });
        const memberNo = `INT-${yearNow}-${seq}`;
        const createdAt = Timestamp.fromDate(new Date(Date.now() - i * 864000));
        await db.collection('members').doc(user.uid).set({
          name,
          nameLower: name.toLowerCase(),
          email,
          region,
          phone: `+38349${String(100000 + i).slice(0,6)}`,
          memberNo,
          agentId: agentUid || null,
          status: 'none',
          year: null,
          expiresAt: null,
          createdAt,
          updatedAt: createdAt,
        });
        // Activate current or previous year randomly (roughly 70% current)
        const activeThisYear = i % 10 !== 0 && i % 3 !== 0; // skip for some variety
        if (activeThisYear) {
          await activateMembership(user.uid, yearNow, 25, 'EUR', 'cash', null);
        } else {
          await activateMembership(user.uid, yearNow - 1, 25, 'EUR', 'cash', null);
          // Mark root doc as expired for clarity in UI
          await db.collection('members').doc(user.uid).set({ status: 'expired' }, { merge: true });
        }
      }

      res.status(200).json({ ok: true, seeded: ['member1@example.com', 'member2@example.com', 'admin@example.com'], agents: agents.map(a=>a.email), members: total });
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

// Daily cleanup of old audit logs and metrics
export const cleanupExpiredData = functions
  .region(REGION)
  .pubsub.schedule('15 3 * * *')
  .timeZone('UTC')
  .onRun(async () => {
    const [aud, met] = await Promise.all([
      cleanupOldAuditLogs(180, 2000),
      cleanupOldMetrics(400, 2000),
    ]);
    console.log('[cleanup] audit_logs deleted:', aud.deleted, 'metrics deleted:', met.deleted);
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
