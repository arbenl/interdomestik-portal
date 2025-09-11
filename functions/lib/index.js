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
exports.getCardKeyStatus = exports.revokeCardToken = exports.generateMonthlyReportNow = exports.exportMonthlyReport = exports.monthlyMembershipReport = exports.cleanupExpiredData = exports.dailyRenewalReminders = exports.stripeWebhook = exports.verifyMembership = exports.clearDatabase = exports.resendMembershipCard = exports.listCoupons = exports.createCoupon = exports.listOrganizations = exports.createOrganization = exports.setAutoRenew = exports.getCardToken = exports.createPaymentIntent = exports.backfillNameLower = exports.importMembersCsv = exports.getUserClaims = exports.agentCreateMember = exports.searchUserByEmail = exports.startMembership = exports.setUserRole = exports.upsertProfile = exports.exportMembersCsv = void 0;
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
const tokens_1 = require("./lib/tokens");
const startMembership_2 = require("./lib/startMembership");
const cleanup_1 = require("./lib/cleanup");
const payments_1 = require("./lib/payments");
const settings_1 = require("./lib/settings");
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
exports.createPaymentIntent = functions
    .region(REGION)
    .https.onCall((data, context) => (0, payments_1.createPaymentIntentLogic)(data, context));
// Returns a signed card token for QR verification links (JWT HS256)
exports.getCardToken = functions
    .region(REGION)
    .https.onCall(async (data, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'Sign in required');
    const isAdmin = context.auth.token?.role === 'admin';
    const requestedUid = data?.uid ? String(data.uid) : context.auth.uid;
    const uid = isAdmin ? requestedUid : context.auth.uid;
    const m = await firebaseAdmin_1.db.collection('members').doc(uid).get();
    if (!m.exists)
        throw new functions.https.HttpsError('not-found', 'Member not found');
    const memberNo = m.get('memberNo');
    if (!memberNo)
        throw new functions.https.HttpsError('failed-precondition', 'MemberNo missing');
    // Use membership expiration if active; else 30d from now
    let expSec;
    const activeSnap = await firebaseAdmin_1.db.collection('members').doc(uid).collection('memberships')
        .where('status', '==', 'active').orderBy('year', 'desc').limit(1).get();
    if (!activeSnap.empty) {
        const expiresAt = activeSnap.docs[0].get('expiresAt');
        if (expiresAt?.toMillis)
            expSec = Math.floor(expiresAt.toMillis() / 1000);
    }
    if (!expSec)
        expSec = Math.floor(Date.now() / 1000) + 30 * 24 * 3600;
    const token = (0, tokens_1.signCardToken)({ mno: memberNo, exp: expSec });
    return { token };
});
// Set auto-renew preference on member profile (self only or admin)
exports.setAutoRenew = functions
    .region(REGION)
    .https.onCall(async (data, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'Sign in required');
    const autoRenew = !!data?.autoRenew;
    const requestedUid = data?.uid ? String(data.uid) : undefined;
    const isAdmin = context.auth.token?.role === 'admin';
    return (0, settings_1.setAutoRenewLogic)(context.auth.uid, requestedUid, autoRenew, isAdmin);
});
// Simple organization management (admin only)
exports.createOrganization = functions
    .region(REGION)
    .https.onCall(async (data, context) => {
    if (!context.auth || context.auth.token?.role !== 'admin') {
        throw new functions.https.HttpsError('permission-denied', 'Admin only');
    }
    const name = String(data?.name || '').trim();
    const billingEmail = String(data?.billingEmail || '').trim();
    const seats = Math.max(0, Number(data?.seats || 0));
    if (!name)
        throw new functions.https.HttpsError('invalid-argument', 'name required');
    const ref = await firebaseAdmin_1.db.collection('orgs').add({ name, billingEmail, seats, activeSeats: 0, createdAt: firestore_1.FieldValue.serverTimestamp() });
    return { ok: true, id: ref.id };
});
exports.listOrganizations = functions
    .region(REGION)
    .https.onCall(async (_data, context) => {
    if (!context.auth || context.auth.token?.role !== 'admin') {
        throw new functions.https.HttpsError('permission-denied', 'Admin only');
    }
    const snap = await firebaseAdmin_1.db.collection('orgs').orderBy('createdAt', 'desc').limit(20).get();
    return { items: snap.docs.map(d => ({ id: d.id, ...d.data() })) };
});
// Coupon management (admin only)
exports.createCoupon = functions
    .region(REGION)
    .https.onCall(async (data, context) => {
    if (!context.auth || context.auth.token?.role !== 'admin') {
        throw new functions.https.HttpsError('permission-denied', 'Admin only');
    }
    const code = String(data?.code || '').trim().toLowerCase();
    if (!code)
        throw new functions.https.HttpsError('invalid-argument', 'code required');
    const percentOff = Math.max(0, Number(data?.percentOff || 0));
    const amountOff = Math.max(0, Number(data?.amountOff || 0));
    const active = data?.active === false ? false : true;
    await firebaseAdmin_1.db.collection('coupons').doc(code).set({ percentOff, amountOff, active, updatedAt: firestore_1.FieldValue.serverTimestamp() }, { merge: true });
    return { ok: true };
});
exports.listCoupons = functions
    .region(REGION)
    .https.onCall(async (_data, context) => {
    if (!context.auth || context.auth.token?.role !== 'admin') {
        throw new functions.https.HttpsError('permission-denied', 'Admin only');
    }
    const snap = await firebaseAdmin_1.db.collection('coupons').limit(50).get();
    return { items: snap.docs.map(d => ({ id: d.id, ...d.data() })) };
});
// Resend digital membership card email to the authenticated user (or admin-specified uid)
exports.resendMembershipCard = functions
    .region(REGION)
    .https.onCall(async (data, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'Sign in required');
    const requestedUid = String((data?.uid ?? '').toString().trim());
    const actorUid = context.auth.uid;
    const isAdmin = context.auth.token?.role === 'admin';
    const uid = requestedUid && isAdmin ? requestedUid : actorUid;
    const memberDoc = await firebaseAdmin_1.db.collection('members').doc(uid).get();
    if (!memberDoc.exists)
        throw new functions.https.HttpsError('not-found', 'Member not found');
    const memberNo = memberDoc.get('memberNo');
    const name = memberDoc.get('name') || 'Member';
    const region = memberDoc.get('region') || '—';
    const email = memberDoc.get('email') || undefined;
    if (!email || !memberNo)
        throw new functions.https.HttpsError('failed-precondition', 'Member profile missing email or memberNo');
    // Determine active year (prefer explicit year from input, else latest active doc)
    const explicitYear = Number.isFinite(Number(data?.year)) ? Number(data?.year) : undefined;
    let yearToUse = explicitYear;
    if (!yearToUse) {
        const act = await firebaseAdmin_1.db.collection('members').doc(uid).collection('memberships')
            .where('status', '==', 'active').orderBy('year', 'desc').limit(1).get();
        if (!act.empty)
            yearToUse = Number(act.docs[0].get('year'));
    }
    if (!yearToUse)
        throw new functions.https.HttpsError('failed-precondition', 'No active membership to resend');
    const verifyUrl = `https://interdomestik.app/verify?memberNo=${encodeURIComponent(memberNo)}`;
    const html = (0, membership_1.membershipCardHtml)({ memberNo, name, region, validity: String(yearToUse), verifyUrl });
    await (0, membership_1.queueEmail)({ to: [email], subject: `Interdomestik Membership ${yearToUse}`, html });
    try {
        await firebaseAdmin_1.db.collection('audit_logs').add({
            action: 'resendMembershipCard',
            actor: actorUid,
            target: uid,
            year: yearToUse,
            ts: firestore_1.FieldValue.serverTimestamp(),
        });
    }
    catch { }
    return { ok: true };
});
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
        // API key auth: if present and valid for 'verify', bypass rate limit and respond minimally
        const apiKey = req.headers?.['x-api-key']?.trim();
        let apiKeyValid = false;
        if (apiKey) {
            try {
                const crypto = await Promise.resolve().then(() => __importStar(require('crypto')));
                const hash = crypto.createHash('sha256').update(apiKey).digest('hex');
                const q = await firebaseAdmin_1.db.collection('api_keys').where('hash', '==', hash).where('active', '==', true).limit(1).get();
                if (!q.empty) {
                    const scopes = q.docs[0].get('scopes') || [];
                    apiKeyValid = scopes.includes('verify');
                }
            }
            catch { }
        }
        // Simple IP-based rate limiting (skips emulator/tests or valid API key). Limits: 60/minute or 1000/day
        const isEmu = !!(process.env.FUNCTIONS_EMULATOR || process.env.FIREBASE_EMULATOR_HUB || process.env.FIRESTORE_EMULATOR_HOST || process.env.GCLOUD_PROJECT === 'demo-interdomestik');
        if (!isEmu && !apiKeyValid) {
            const fwd = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
            const ip = fwd || req.ip || (req.socket && req.socket.remoteAddress) || 'unknown';
            const crypto = await Promise.resolve().then(() => __importStar(require('node:crypto')));
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
        const token = String((req.query.token ?? '')).trim();
        let memberNo = String((req.query.memberNo ?? '')).trim();
        if (token && !memberNo) {
            try {
                const { verifyCardToken } = await Promise.resolve().then(() => __importStar(require('./lib/tokens')));
                const claims = verifyCardToken(token);
                if (claims && typeof claims.mno === 'string') {
                    memberNo = String(claims.mno);
                    // Optional: check revocation list
                    const jti = claims.jti;
                    if (jti) {
                        const revoked = await firebaseAdmin_1.db.collection('card_revocations').doc(jti).get();
                        if (revoked.exists) {
                            res.json({ ok: true, valid: false, memberNo, reason: 'revoked' });
                            return;
                        }
                    }
                }
            }
            catch { }
        }
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
        let isValid = false;
        try {
            // Fetch active memberships and filter by expiry in code to avoid composite index needs
            const snapAct = await firebaseAdmin_1.db
                .collection('members')
                .doc(doc.id)
                .collection('memberships')
                .where('status', '==', 'active')
                .limit(5)
                .get();
            const nowMs = Date.now();
            for (const d of snapAct.docs) {
                const exp = d.get('expiresAt');
                if (!exp) {
                    isValid = true;
                    break;
                }
                const ms = typeof exp?.toMillis === 'function' ? exp.toMillis() : (typeof exp?.seconds === 'number' ? exp.seconds * 1000 : 0);
                if (ms > nowMs) {
                    isValid = true;
                    break;
                }
            }
        }
        catch {
            // Defensive: avoid 500 in tests/emulator
            isValid = false;
        }
        if (apiKeyValid) {
            res.json({ ok: true, valid: isValid, memberNo });
        }
        else {
            res.json({
                ok: true,
                valid: isValid,
                memberNo,
                name: doc.get('name') || 'Member',
                region: doc.get('region') || '—',
            });
        }
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
                // Activate membership for current (or configured) year
                const envYear = Number(process.env.MEMBER_YEAR);
                const year = (!Number.isNaN(envYear) && envYear >= 2020 && envYear <= 2100)
                    ? envYear
                    : new Date().getUTCFullYear();
                try {
                    await (0, startMembership_2.activateMembership)(uid, year, amount / 100, currency, 'card', invoiceId);
                    // Send card + receipt emails
                    try {
                        const m = await firebaseAdmin_1.db.collection('members').doc(uid).get();
                        const email = m.get('email');
                        const name = m.get('name') || 'Member';
                        const memberNo = m.get('memberNo');
                        const region = m.get('region') || '—';
                        if (email && memberNo) {
                            const token = (0, tokens_1.signCardToken)({ mno: memberNo, exp: Math.floor(new Date(year, 11, 31, 23, 59, 59).getTime() / 1000) });
                            const verifyUrl = `https://interdomestik.app/verify?token=${token}`;
                            const html = (0, membership_1.membershipCardHtml)({ memberNo, name, region, validity: String(year), verifyUrl });
                            await (0, membership_1.queueEmail)({ to: [email], subject: `Interdomestik Membership ${year}`, html });
                            await (0, membership_1.sendPaymentReceipt)({ email, name, memberNo, amount: amount / 100, currency, method: 'card', reference: invoiceId });
                        }
                    }
                    catch (e) {
                        console.warn('[stripeWebhook] email dispatch failed', e);
                    }
                    // Minimal audit and metrics handled inside startMembership logic normally; here we emulate key parts
                    await firebaseAdmin_1.db.collection('audit_logs').add({
                        action: 'startMembership',
                        actor: 'stripe-webhook',
                        target: uid,
                        year,
                        amount: amount / 100,
                        currency,
                        method: 'card',
                        ts: firestore_1.FieldValue.serverTimestamp(),
                    });
                }
                catch (e) {
                    console.warn('[stripeWebhook] activateMembership failed', e);
                }
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
        // Emulator path: also activate membership directly
        try {
            const envYear = Number(process.env.MEMBER_YEAR);
            const year = (!Number.isNaN(envYear) && envYear >= 2020 && envYear <= 2100)
                ? envYear
                : new Date().getUTCFullYear();
            await (0, startMembership_2.activateMembership)(uid, year, amount / 100, currency, 'card', invoiceId);
            // Also send the membership card email in emulator mode for end-to-end UX
            try {
                const m = await firebaseAdmin_1.db.collection('members').doc(uid).get();
                const email = m.get('email');
                const name = m.get('name') || 'Member';
                const memberNo = m.get('memberNo');
                const region = m.get('region') || '—';
                if (email && memberNo) {
                    const token = (0, tokens_1.signCardToken)({ mno: memberNo, exp: Math.floor(new Date(year, 11, 31, 23, 59, 59).getTime() / 1000) });
                    const verifyUrl = `https://interdomestik.app/verify?token=${token}`;
                    const html = (0, membership_1.membershipCardHtml)({ memberNo, name, region, validity: String(year), verifyUrl });
                    await (0, membership_1.queueEmail)({ to: [email], subject: `Interdomestik Membership ${year}`, html });
                    await (0, membership_1.sendPaymentReceipt)({ email, name, memberNo, amount: amount / 100, currency, method: 'card', reference: invoiceId });
                }
            }
            catch (e) {
                console.warn('[stripeWebhook][emu] email dispatch failed', e);
            }
        }
        catch (e) {
            console.warn('[stripeWebhook][emu] activateMembership failed', e);
        }
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
            // Create several agents for testing agent ownership flows
            const agentDefs = [
                { email: 'agent1@example.com', regions: ['PRISHTINA', 'FERIZAJ'], name: 'Agent One' },
                { email: 'agent2@example.com', regions: ['PEJA', 'PRIZREN'], name: 'Agent Two' },
                { email: 'agent3@example.com', regions: ['GJAKOVA', 'GJILAN', 'MITROVICA'], name: 'Agent Three' },
            ];
            const agents = [];
            for (const a of agentDefs) {
                const u = await firebaseAdmin_1.admin.auth().createUser({ email: a.email, password: 'password123', displayName: a.name, emailVerified: true });
                await firebaseAdmin_1.admin.auth().setCustomUserClaims(u.uid, { role: 'agent', allowedRegions: a.regions });
                await firebaseAdmin_1.db.collection('members').doc(u.uid).set({
                    name: a.name,
                    email: a.email,
                    memberNo: `INT-2025-A${Math.floor(Math.random() * 900 + 100)}`,
                    region: a.regions[0],
                    role: 'agent',
                    createdAt: firestore_1.Timestamp.now(),
                    updatedAt: firestore_1.Timestamp.now(),
                });
                agents.push({ uid: u.uid, email: a.email, regions: a.regions });
            }
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
            // Bulk-create seed members distributed across regions and agents
            const regions = ['PRISHTINA', 'PRIZREN', 'GJAKOVA', 'PEJA', 'FERIZAJ', 'GJILAN', 'MITROVICA'];
            const regionToAgentUid = new Map();
            for (const a of agents) {
                for (const r of a.regions)
                    regionToAgentUid.set(r, a.uid);
            }
            const yearNow = new Date().getUTCFullYear();
            const total = 60;
            for (let i = 1; i <= total; i++) {
                const seq = String(100 + i).padStart(6, '0');
                const name = `Seed Member ${String(i).padStart(2, '0')}`;
                const email = `seed${String(i).padStart(3, '0')}@example.com`;
                const region = regions[(i - 1) % regions.length];
                const agentUid = regionToAgentUid.get(region);
                const user = await firebaseAdmin_1.admin.auth().createUser({ email, password: 'password123', displayName: name, emailVerified: true });
                const memberNo = `INT-${yearNow}-${seq}`;
                const createdAt = firestore_1.Timestamp.fromDate(new Date(Date.now() - i * 864000));
                await firebaseAdmin_1.db.collection('members').doc(user.uid).set({
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
                });
                // Activate current or previous year randomly (roughly 70% current)
                const activeThisYear = i % 10 !== 0 && i % 3 !== 0; // skip for some variety
                if (activeThisYear) {
                    await (0, startMembership_2.activateMembership)(user.uid, yearNow, 25, 'EUR', 'cash', null);
                }
                else {
                    await (0, startMembership_2.activateMembership)(user.uid, yearNow - 1, 25, 'EUR', 'cash', null);
                    // Mark root doc as expired for clarity in UI
                    await firebaseAdmin_1.db.collection('members').doc(user.uid).set({ status: 'expired' }, { merge: true });
                }
            }
            res.status(200).json({ ok: true, seeded: ['member1@example.com', 'member2@example.com', 'admin@example.com'], agents: agents.map(a => a.email), members: total });
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
// Daily cleanup of old audit logs and metrics
exports.cleanupExpiredData = functions
    .region(REGION)
    .pubsub.schedule('15 3 * * *')
    .timeZone('UTC')
    .onRun(async () => {
    const [aud, met] = await Promise.all([
        (0, cleanup_1.cleanupOldAuditLogs)(180, 2000),
        (0, cleanup_1.cleanupOldMetrics)(400, 2000),
    ]);
    console.log('[cleanup] audit_logs deleted:', aud.deleted, 'metrics deleted:', met.deleted);
});
// Monthly membership report aggregation for previous month
exports.monthlyMembershipReport = functions
    .region(REGION)
    .pubsub.schedule('10 0 1 * *') // 00:10 UTC on the 1st of each month
    .timeZone('UTC')
    .onRun(async () => {
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = now.getUTCMonth();
    const prev = new Date(Date.UTC(m === 0 ? y - 1 : y, m === 0 ? 11 : m - 1, 1));
    const year = prev.getUTCFullYear();
    const month = prev.getUTCMonth() + 1;
    const monthKey = `${year}-${String(month).padStart(2, '0')}`;
    const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
    const end = new Date(Date.UTC(year, month, 0, 23, 59, 59));
    const startTs = firebaseAdmin_1.admin.firestore.Timestamp.fromDate(start);
    const endTs = firebaseAdmin_1.admin.firestore.Timestamp.fromDate(end);
    const q = await firebaseAdmin_1.db.collection('audit_logs')
        .where('action', '==', 'startMembership')
        .where('ts', '>=', startTs)
        .where('ts', '<=', endTs)
        .get();
    let total = 0;
    let revenue = 0;
    const byRegion = {};
    const byMethod = {};
    q.forEach((d) => {
        total += 1;
        const amt = Number(d.get('amount') || 0);
        revenue += isFinite(amt) ? amt : 0;
        const reg = String(d.get('region') || 'UNKNOWN');
        byRegion[reg] = (byRegion[reg] || 0) + 1;
        const meth = String(d.get('method') || 'unknown');
        byMethod[meth] = (byMethod[meth] || 0) + 1;
    });
    await firebaseAdmin_1.db.collection('reports').doc(`monthly-${monthKey}`).set({
        type: 'monthly',
        month: monthKey,
        range: { start: startTs, end: endTs },
        total, revenue,
        byRegion, byMethod,
        updatedAt: firebaseAdmin_1.admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
});
// CSV export for monthly report (admin only)
exports.exportMonthlyReport = functions
    .region(REGION)
    .https.onRequest(async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
        res.status(204).end();
        return;
    }
    if (req.method !== 'GET') {
        res.status(405).send('Method not allowed');
        return;
    }
    const month = String(req.query.month || '').trim();
    if (!/^\d{4}-\d{2}$/.test(month)) {
        res.status(400).send('month=YYYY-MM required');
        return;
    }
    const doc = await firebaseAdmin_1.db.collection('reports').doc(`monthly-${month}`).get();
    if (!doc.exists) {
        res.status(404).send('Report not found');
        return;
    }
    const data = doc.data();
    const rows = [];
    rows.push('metric,value');
    rows.push(`total,${data.total || 0}`);
    rows.push(`revenue,${data.revenue || 0}`);
    rows.push('');
    rows.push('region,count');
    const byRegion = data.byRegion || {};
    for (const k of Object.keys(byRegion))
        rows.push(`${k},${byRegion[k]}`);
    rows.push('');
    rows.push('method,count');
    const byMethod = data.byMethod || {};
    for (const k of Object.keys(byMethod))
        rows.push(`${k},${byMethod[k]}`);
    const csv = rows.join('\n');
    res.set('Content-Type', 'text/csv');
    res.set('Content-Disposition', `attachment; filename=monthly-${month}.csv`);
    res.status(200).send(csv);
});
// On-demand monthly report generation (admin only, callable)
exports.generateMonthlyReportNow = functions
    .region(REGION)
    .https.onCall(async (data, context) => {
    if (!context.auth || context.auth.token?.role !== 'admin') {
        throw new functions.https.HttpsError('permission-denied', 'Admin only');
    }
    const month = String(data?.month || '').trim(); // YYYY-MM or '' => previous month
    let target;
    if (/^\d{4}-\d{2}$/.test(month)) {
        target = month;
    }
    else {
        const now = new Date();
        const y = now.getUTCFullYear();
        const m = now.getUTCMonth();
        const prev = new Date(Date.UTC(m === 0 ? y - 1 : y, m === 0 ? 11 : m - 1, 1));
        target = `${prev.getUTCFullYear()}-${String(prev.getUTCMonth() + 1).padStart(2, '0')}`;
    }
    const [year, monthNum] = target.split('-').map((x) => Number(x));
    const start = new Date(Date.UTC(year, monthNum - 1, 1, 0, 0, 0));
    const end = new Date(Date.UTC(year, monthNum, 0, 23, 59, 59));
    const startTs = firebaseAdmin_1.admin.firestore.Timestamp.fromDate(start);
    const endTs = firebaseAdmin_1.admin.firestore.Timestamp.fromDate(end);
    const q = await firebaseAdmin_1.db.collection('audit_logs')
        .where('action', '==', 'startMembership')
        .where('ts', '>=', startTs)
        .where('ts', '<=', endTs)
        .get();
    let total = 0;
    let revenue = 0;
    const byRegion = {};
    const byMethod = {};
    q.forEach((d) => {
        total += 1;
        const amt = Number(d.get('amount') || 0);
        revenue += isFinite(amt) ? amt : 0;
        const reg = String(d.get('region') || 'UNKNOWN');
        byRegion[reg] = (byRegion[reg] || 0) + 1;
        const meth = String(d.get('method') || 'unknown');
        byMethod[meth] = (byMethod[meth] || 0) + 1;
    });
    await firebaseAdmin_1.db.collection('reports').doc(`monthly-${target}`).set({
        type: 'monthly', month: target, range: { start: startTs, end: endTs }, total, revenue, byRegion, byMethod,
        updatedAt: firebaseAdmin_1.admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    return { ok: true, month: target, total, revenue };
});
// Token helpers: admin utilities for revocation and status
exports.revokeCardToken = functions
    .region(REGION)
    .https.onCall(async (data, context) => {
    if (!context.auth || context.auth.token?.role !== 'admin') {
        throw new functions.https.HttpsError('permission-denied', 'Admin only');
    }
    const jti = String(data?.jti || '').trim();
    const reason = String(data?.reason || 'manual');
    if (!jti)
        throw new functions.https.HttpsError('invalid-argument', 'jti required');
    await firebaseAdmin_1.db.collection('card_revocations').doc(jti).set({ reason, ts: firestore_1.FieldValue.serverTimestamp() }, { merge: true });
    return { ok: true };
});
exports.getCardKeyStatus = functions
    .region(REGION)
    .https.onCall(async (_data, context) => {
    if (!context.auth || context.auth.token?.role !== 'admin') {
        throw new functions.https.HttpsError('permission-denied', 'Admin only');
    }
    const activeKid = process.env.CARD_JWT_ACTIVE_KID || 'v1';
    const secretsRaw = process.env.CARD_JWT_SECRETS || '';
    let kids = [];
    try {
        const m = JSON.parse(secretsRaw || '{}');
        kids = Object.keys(m || {});
    }
    catch { }
    if (kids.length === 0)
        kids = ['v1'];
    return { activeKid, kids };
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
