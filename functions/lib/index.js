"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.dailyRenewalReminders = exports.stripeWebhook = exports.verifyMembership = exports.clearDatabase = exports.backfillNameLower = exports.importMembersCsv = exports.getUserClaims = exports.agentCreateMember = exports.searchUserByEmail = exports.startMembership = exports.setUserRole = exports.upsertProfile = exports.exportMembersCsv = void 0;
const functions = __importStar(require("firebase-functions/v1"));
const firestore_1 = require("firebase-admin/firestore");
const firebaseAdmin_1 = require("./firebaseAdmin");
const upsertProfile_1 = require("./lib/upsertProfile");
const user_1 = require("./lib/user");
const importCsv_1 = require("./lib/importCsv");
const backfill_1 = require("./lib/backfill");
const startMembership_1 = require("./lib/startMembership");
const agent_1 = require("./lib/agent");
const membership_1 = require("./lib/membership");
var exportMembersCsv_1 = require("./exportMembersCsv");
Object.defineProperty(exports, "exportMembersCsv", { enumerable: true, get: function () { return exportMembersCsv_1.exportMembersCsv; } });
// Region constant for consistency
const REGION = "europe-west1";
// Callable functions ---------------------------------------------------------
exports.upsertProfile = functions
    .region(REGION)
    .https.onCall((data, context) => (0, upsertProfile_1.upsertProfileLogic)(data, context));
exports.setUserRole = functions
    .region(REGION)
    .https.onCall((data, context) => (0, user_1.setUserRoleLogic)(data, context));
exports.startMembership = functions
    .region(REGION)
    .https.onCall((data, context) => (0, startMembership_1.startMembershipLogic)(data, context));
exports.searchUserByEmail = functions
    .region(REGION)
    .https.onCall((data, context) => (0, user_1.searchUserByEmailLogic)(data, context));
exports.agentCreateMember = functions
    .region(REGION)
    .https.onCall((data, context) => (0, agent_1.agentCreateMemberLogic)(data, context));
exports.getUserClaims = functions
    .region(REGION)
    .https.onCall((data, context) => (0, user_1.getUserClaimsLogic)(data, context));
exports.importMembersCsv = functions
    .region(REGION)
    .https.onCall((data, context) => (0, importCsv_1.importMembersCsvLogic)(data, context));
exports.backfillNameLower = functions
    .region(REGION)
    .https.onCall((data, context) => (0, backfill_1.backfillNameLowerLogic)(data, context));
// HTTP utilities -------------------------------------------------------------
exports.clearDatabase = functions
    .region(REGION)
    .https.onRequest(async (req, res) => {
    try {
        // CORS for local tools
        res.set("Access-Control-Allow-Origin", "*");
        res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        res.set("Access-Control-Allow-Headers", "Content-Type");
        if (req.method === 'OPTIONS') {
            res.status(204).end();
            return;
        }
        const auth = firebaseAdmin_1.admin.auth();
        const listUsersResult = await auth.listUsers();
        await Promise.all(listUsersResult.users.map((user) => auth.deleteUser(user.uid)));
        const membersSnapshot = await firebaseAdmin_1.db.collection('members').get();
        await Promise.all(membersSnapshot.docs.map((d) => d.ref.delete()));
        res.status(200).send('Database cleared successfully.');
    }
    catch (error) {
        console.error('Error clearing database:', error);
        if (error instanceof Error)
            res.status(500).send(`Error clearing database: ${error.message}`);
        else
            res.status(500).send('An unknown error occurred during database clearing.');
    }
});
exports.verifyMembership = functions
    .region(REGION)
    .https.onRequest(async (req, res) => {
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
            const ip = fwd || req.ip || (req.socket && req.socket.remoteAddress) || 'unknown';
            const crypto = await Promise.resolve().then(() => __importStar(require('crypto')));
            const hash = crypto.createHash('sha256').update(String(ip)).digest('hex').slice(0, 12);
            const now = new Date();
            const dayKey = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}${String(now.getUTCDate()).padStart(2, '0')}`;
            const minuteKey = Math.floor(now.getTime() / 60000); // epoch minute
            const ref = firebaseAdmin_1.db.collection('ratelimit_verify').doc(`${dayKey}-${hash}`);
            let limited = false;
            await firebaseAdmin_1.db.runTransaction(async (tx) => {
                const snap = await tx.get(ref);
                const data = snap.exists ? snap.data() : {};
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
                    updatedAt: firestore_1.FieldValue.serverTimestamp(),
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
        const q = await firebaseAdmin_1.db
            .collection("members")
            .where("memberNo", "==", memberNo)
            .limit(1)
            .get();
        if (q.empty) {
            res.json({ ok: true, valid: false, memberNo });
            return;
        }
        const doc = q.docs[0];
        const activeSnap = await firebaseAdmin_1.db
            .collection("members")
            .doc(doc.id)
            .collection("memberships")
            .where("status", "==", "active")
            .where("expiresAt", ">", firestore_1.Timestamp.now())
            .limit(1)
            .get();
        res.json({
            ok: true,
            valid: !activeSnap.empty,
            memberNo,
            name: doc.get("name") || "Member",
            region: doc.get("region") || "—",
        });
        return;
    }
    catch (e) {
        res.status(500).json({ ok: false, error: String(e) });
        return;
    }
});
// Stripe webhook (emulator-friendly placeholder). In production, add signature verification.
exports.stripeWebhook = functions
    .region(REGION)
    .https.onRequest(async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Stripe-Signature');
    if (req.method === 'OPTIONS') {
        res.status(204).end();
        return;
    }
    if (req.method !== 'POST') {
        res.status(405).send('Method not allowed');
        return;
    }
    try {
        const signingSecret = process.env.STRIPE_SIGNING_SECRET;
        const sig = req?.headers ? req.headers['stripe-signature'] : undefined;
        const isStripeMode = !!(signingSecret && sig);
        if (isStripeMode) {
            // Verify signature and construct event
            // Indirect dynamic import to avoid hard dependency in test/emulator without package
            const Stripe = (await Function('m', 'return import(m)')('stripe')).default;
            const stripe = new Stripe(process.env.STRIPE_API_KEY || '', { apiVersion: '2024-06-20' });
            let event;
            try {
                event = stripe.webhooks.constructEvent(req.rawBody, sig, signingSecret);
            }
            catch (err) {
                console.error('[stripeWebhook] signature verification failed', err);
                res.status(400).send(`Webhook Error: ${err.message}`);
                return;
            }
            // Idempotency: skip if processed
            const eventDoc = firebaseAdmin_1.db.collection('webhooks_stripe').doc(event.id);
            const already = await eventDoc.get();
            if (already.exists && already.get('processed')) {
                res.json({ ok: true, duplicate: true });
                return;
            }
            if (event.type === 'invoice.payment_succeeded') {
                const inv = event.data.object;
                const uid = inv.metadata?.uid;
                if (!uid) {
                    res.status(400).send('metadata.uid missing');
                    return;
                }
                const invoiceId = inv.id || `inv_${Date.now()}`;
                const amount = Number(inv.amount_paid || inv.amount_due || 0);
                const currency = (inv.currency || 'eur').toUpperCase();
                const created = firestore_1.Timestamp.fromMillis((inv.created || Math.floor(Date.now() / 1000)) * 1000);
                await firebaseAdmin_1.db.runTransaction(async (tx) => {
                    const invRef = firebaseAdmin_1.db.collection('billing').doc(uid).collection('invoices').doc(invoiceId);
                    tx.set(invRef, { invoiceId, amount, currency, created, status: 'paid' }, { merge: true });
                    tx.set(eventDoc, { processed: true, type: event.type, at: firestore_1.FieldValue.serverTimestamp() }, { merge: true });
                });
                res.json({ ok: true });
                return;
            }
            // Unhandled event types acknowledged
            await eventDoc.set({ processed: true, type: event.type, at: firestore_1.FieldValue.serverTimestamp() }, { merge: true });
            res.json({ ok: true, ignored: true, type: event.type });
            return;
        }
        // Emulator-friendly JSON fallback
        const body = req.body || {};
        const uid = String(body.uid || '');
        if (!uid) {
            res.status(400).send('uid required');
            return;
        }
        const invoiceId = String(body.invoiceId || `inv_${Date.now()}`);
        const amount = Number(body.amount || 0);
        const currency = String(body.currency || 'EUR');
        const created = body.created ? firestore_1.Timestamp.fromDate(new Date(body.created)) : firestore_1.Timestamp.now();
        await firebaseAdmin_1.db.collection('billing').doc(uid).collection('invoices').doc(invoiceId).set({
            invoiceId, amount, currency, created,
            status: 'paid',
        }, { merge: true });
        res.json({ ok: true, mode: 'emulator' });
    }
    catch (e) {
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
            if (req.method === 'OPTIONS') {
                res.status(204).end();
                return;
            }
            // Create two member accounts
            const member1 = await firebaseAdmin_1.admin.auth().createUser({
                email: 'member1@example.com',
                password: 'password123',
                displayName: 'Member One',
                emailVerified: true,
            });
            await firebaseAdmin_1.db.collection('members').doc(member1.uid).set({
                name: 'Member One',
                email: 'member1@example.com',
                memberNo: 'INT-2025-000001',
                region: 'PRISHTINA',
                role: 'member',
                createdAt: firestore_1.Timestamp.now(),
                updatedAt: firestore_1.Timestamp.now(),
            });
            await firebaseAdmin_1.db.collection('members').doc(member1.uid).collection('memberships').doc('2025').set({
                year: 2025,
                status: 'active',
                startedAt: firestore_1.Timestamp.fromDate(new Date('2025-01-01')),
                expiresAt: firestore_1.Timestamp.fromDate(new Date('2025-12-31')),
                price: 100,
                currency: 'EUR',
                paymentMethod: 'cash',
                externalRef: null,
                updatedAt: firestore_1.Timestamp.now(),
            });
            const member2 = await firebaseAdmin_1.admin.auth().createUser({
                email: 'member2@example.com',
                password: 'password123',
                displayName: 'Member Two',
                emailVerified: true,
            });
            await firebaseAdmin_1.db.collection('members').doc(member2.uid).set({
                name: 'Member Two',
                email: 'member2@example.com',
                memberNo: 'INT-2025-000002',
                region: 'PEJA',
                role: 'member',
                createdAt: firestore_1.Timestamp.now(),
                updatedAt: firestore_1.Timestamp.now(),
            });
            // Create an admin for admin-screen testing
            const adminUser = await firebaseAdmin_1.admin.auth().createUser({
                email: 'admin@example.com',
                password: 'password123',
                displayName: 'Admin User',
                emailVerified: true,
            });
            await firebaseAdmin_1.admin.auth().setCustomUserClaims(adminUser.uid, { role: 'admin', allowedRegions: ['PRISHTINA', 'PEJA'] });
            await firebaseAdmin_1.db.collection('members').doc(adminUser.uid).set({
                name: 'Admin User',
                email: 'admin@example.com',
                memberNo: 'INT-2025-999999',
                region: 'PRISHTINA',
                role: 'admin',
                createdAt: firestore_1.Timestamp.now(),
                updatedAt: firestore_1.Timestamp.now(),
            });
            // Seed a couple of events
            await firebaseAdmin_1.db.collection('events').add({
                title: 'Welcome meetup — PRISHTINA',
                startAt: firestore_1.Timestamp.fromDate(new Date(Date.now() + 7 * 86400000)),
                location: 'PRISHTINA',
                createdAt: firestore_1.Timestamp.now(),
            });
            await firebaseAdmin_1.db.collection('events').add({
                title: 'Volunteer day',
                startAt: firestore_1.Timestamp.fromDate(new Date(Date.now() + 21 * 86400000)),
                location: 'PEJA',
                createdAt: firestore_1.Timestamp.now(),
            });
            res.status(200).json({ ok: true, seeded: ['member1@example.com', 'member2@example.com', 'admin@example.com'] });
        }
        catch (error) {
            console.error('Error seeding database:', error);
            if (error instanceof Error) {
                res.status(500).send(`Error seeding database: ${error.message}`);
            }
            else {
                res.status(500).send('An unknown error occurred during database seeding.');
            }
        }
    });
}
// Scheduled renewal reminders at ~03:00 UTC daily
exports.dailyRenewalReminders = functions
    .region(REGION)
    .pubsub.schedule('0 3 * * *')
    .timeZone('UTC')
    .onRun(async () => {
    const now = firebaseAdmin_1.admin.firestore.Timestamp.now();
    const today = now.toDate();
    async function runForOffset(days) {
        const target = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + days));
        const start = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), target.getUTCDate(), 0, 0, 0));
        const end = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), target.getUTCDate(), 23, 59, 59));
        const startTs = firebaseAdmin_1.admin.firestore.Timestamp.fromDate(start);
        const endTs = firebaseAdmin_1.admin.firestore.Timestamp.fromDate(end);
        const q = await firebaseAdmin_1.db.collection('members')
            .where('expiresAt', '>=', startTs)
            .where('expiresAt', '<=', endTs)
            .get();
        for (const d of q.docs) {
            const email = d.get('email');
            const name = d.get('name') || 'Member';
            const memberNo = d.get('memberNo');
            if (!email || !memberNo)
                continue;
            const expiresAt = d.get('expiresAt');
            const expiresOn = expiresAt.toDate().toISOString().slice(0, 10);
            await (0, membership_1.sendRenewalReminder)({ email, name, memberNo, expiresOn });
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
