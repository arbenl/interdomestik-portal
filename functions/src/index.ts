import * as functions from 'firebase-functions/v1';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { admin, db } from './firebaseAdmin';
import { upsertProfileLogic } from './lib/upsertProfile';
import {
  setUserRoleLogic,
  searchUserByEmailLogic,
  getUserClaimsLogic,
} from './lib/user';
import { importMembersCsvLogic } from './lib/importCsv';
import { backfillNameLowerLogic } from './lib/backfill';
import { startMembershipLogic } from './lib/startMembership';
import { agentCreateMemberLogic } from './lib/agent';
import {
  sendRenewalReminder,
  membershipCardHtml,
  queueEmail,
  sendPaymentReceipt,
} from './lib/membership';
import { signCardToken, getCardKeyStatus } from './lib/tokens';
import { activateMembership } from './lib/startMembership';
import { cleanupOldAuditLogs, cleanupOldMetrics } from './lib/cleanup';
import { createPaymentIntentLogic } from './lib/payments';
import { setAutoRenewLogic } from './lib/settings';
export { exportMembersCsv } from './exportMembersCsv';
import { monthlyReportCsv } from './lib/reports';
import { generateMembersCsv, saveCsvToStorage } from './lib/exports';
import { normalizeColumns, streamMembersCsv } from './lib/exportsV2';
import { log } from './lib/logger';
import { getPortalDashboardLogic, getPortalLayoutLogic } from './lib/dashboard';
export { upsertPortalLayout } from './portalLayouts';
import { startAssistantSuggestionLogic } from './lib/assistant';
import { updateMfaPreferenceLogic } from './lib/security';
import { shareDocumentLogic } from './lib/documents';
import { runRenewalHooks } from './lib/automation';

// Region constant for consistency
const REGION = 'europe-west1' as const;

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
  .https.onCall((data, context) =>
    createPaymentIntentLogic(data as any, context)
  );

export const getPortalDashboard = functions
  .region(REGION)
  .https.onCall(async (_data, context) => {
    try {
      return await getPortalDashboardLogic(context);
    } catch (error) {
      log('get_portal_dashboard_error', { error: String(error) });
      throw error;
    }
  });

export const getPortalLayout = functions
  .region(REGION)
  .https.onCall(async (_data, context) => {
    try {
      return await getPortalLayoutLogic(context);
    } catch (error) {
      log('get_portal_layout_error', { error: String(error) });
      throw error;
    }
  });

export const startAssistantSuggestion = functions
  .region(REGION)
  .https.onCall(async (data, context) => {
    try {
      return await startAssistantSuggestionLogic(data, context);
    } catch (error) {
      log('start_assistant_suggestion_error', { error: String(error) });
      throw error;
    }
  });

export const updateMfaPreference = functions
  .region(REGION)
  .https.onCall(async (data, context) =>
    updateMfaPreferenceLogic(data, context)
  );

export const shareDocument = functions
  .region(REGION)
  .https.onCall(async (data, context) => shareDocumentLogic(data, context));

export const triggerRenewalAutomations = functions
  .region(REGION)
  .https.onCall(async (_data, context) => runRenewalHooks(context));

export const processRenewalAutomations = functions
  .region(REGION)
  .pubsub.schedule('0 6 * * *')
  .timeZone('Europe/Brussels')
  .onRun(async () => {
    await runRenewalHooks(null);
  });

// Returns a signed card token for QR verification links (JWT HS256)
export const getCardToken = functions
  .region(REGION)
  .https.onCall(async (data, context) => {
    if (!context.auth)
      throw new functions.https.HttpsError(
        'unauthenticated',
        'Sign in required'
      );
    const isAdmin = (context.auth.token as any)?.role === 'admin';
    const requestedUid = data?.uid ? String(data.uid) : context.auth.uid;
    const uid = isAdmin ? requestedUid : context.auth.uid;
    const m = await db.collection('members').doc(uid).get();
    if (!m.exists)
      throw new functions.https.HttpsError('not-found', 'Member not found');
    const memberNo = m.get('memberNo') as string | undefined;
    if (!memberNo)
      throw new functions.https.HttpsError(
        'failed-precondition',
        'MemberNo missing'
      );

    // Use membership expiration if active; else 30d from now
    let expSec: number | undefined;
    const activeSnap = await db
      .collection('members')
      .doc(uid)
      .collection('memberships')
      .where('status', '==', 'active')
      .orderBy('year', 'desc')
      .limit(1)
      .get();
    if (!activeSnap.empty) {
      const expiresAt = activeSnap.docs[0].get('expiresAt');
      if (expiresAt?.toMillis) expSec = Math.floor(expiresAt.toMillis() / 1000);
    }
    if (!expSec) expSec = Math.floor(Date.now() / 1000) + 30 * 24 * 3600;

    const token = signCardToken({ mno: memberNo, exp: expSec });
    return { token };
  });

// Set auto-renew preference on member profile (self only or admin)
export const setAutoRenew = functions
  .region(REGION)
  .https.onCall(async (data, context) => {
    if (!context.auth)
      throw new functions.https.HttpsError(
        'unauthenticated',
        'Sign in required'
      );
    const autoRenew = !!data?.autoRenew;
    const requestedUid = data?.uid ? String(data.uid) : undefined;
    const isAdmin = (context.auth.token as any)?.role === 'admin';
    return setAutoRenewLogic(
      context.auth.uid,
      requestedUid,
      autoRenew,
      isAdmin
    );
  });

// Simple organization management (admin only)
export const createOrganization = functions
  .region(REGION)
  .https.onCall(async (data, context) => {
    if (!context.auth || (context.auth.token as any)?.role !== 'admin') {
      throw new functions.https.HttpsError('permission-denied', 'Admin only');
    }
    const name = String(data?.name || '').trim();
    const billingEmail = String(data?.billingEmail || '').trim();
    const seats = Math.max(0, Number(data?.seats || 0));
    if (!name)
      throw new functions.https.HttpsError('invalid-argument', 'name required');
    const ref = await db.collection('orgs').add({
      name,
      billingEmail,
      seats,
      activeSeats: 0,
      createdAt: FieldValue.serverTimestamp(),
    });
    return { ok: true, id: ref.id };
  });

export const listOrganizations = functions
  .region(REGION)
  .https.onCall(async (_data, context) => {
    if (!context.auth || (context.auth.token as any)?.role !== 'admin') {
      throw new functions.https.HttpsError('permission-denied', 'Admin only');
    }
    const snap = await db
      .collection('orgs')
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get();
    return {
      items: snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })),
    };
  });

// Coupon management (admin only)
export const createCoupon = functions
  .region(REGION)
  .https.onCall(async (data, context) => {
    if (!context.auth || (context.auth.token as any)?.role !== 'admin') {
      throw new functions.https.HttpsError('permission-denied', 'Admin only');
    }
    const code = String(data?.code || '')
      .trim()
      .toLowerCase();
    if (!code)
      throw new functions.https.HttpsError('invalid-argument', 'code required');
    const percentOff = Math.max(0, Number(data?.percentOff || 0));
    const amountOff = Math.max(0, Number(data?.amountOff || 0));
    const active = data?.active === false ? false : true;
    await db.collection('coupons').doc(code).set(
      {
        percentOff,
        amountOff,
        active,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    return { ok: true };
  });

export const listCoupons = functions
  .region(REGION)
  .https.onCall(async (_data, context) => {
    if (!context.auth || (context.auth.token as any)?.role !== 'admin') {
      throw new functions.https.HttpsError('permission-denied', 'Admin only');
    }
    const snap = await db.collection('coupons').limit(50).get();
    return {
      items: snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })),
    };
  });
// Resend digital membership card email to the authenticated user (or admin-specified uid)
export const resendMembershipCard = functions
  .region(REGION)
  .https.onCall(async (data, context) => {
    if (!context.auth)
      throw new functions.https.HttpsError(
        'unauthenticated',
        'Sign in required'
      );
    const requestedUid = String((data?.uid ?? '').toString().trim());
    const actorUid = context.auth.uid;
    const isAdmin = (context.auth.token as any)?.role === 'admin';
    const uid = requestedUid && isAdmin ? requestedUid : actorUid;

    const memberDoc = await db.collection('members').doc(uid).get();
    if (!memberDoc.exists)
      throw new functions.https.HttpsError('not-found', 'Member not found');
    const memberNo = memberDoc.get('memberNo') as string | undefined;
    const name = (memberDoc.get('name') as string | undefined) || 'Member';
    const region = (memberDoc.get('region') as string | undefined) || '—';
    const email = (memberDoc.get('email') as string | undefined) || undefined;
    if (!email || !memberNo)
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Member profile missing email or memberNo'
      );

    // Determine active year (prefer explicit year from input, else latest active doc)
    const explicitYear = Number.isFinite(Number(data?.year))
      ? Number(data?.year)
      : undefined;
    let yearToUse: number | undefined = explicitYear;
    if (!yearToUse) {
      const act = await db
        .collection('members')
        .doc(uid)
        .collection('memberships')
        .where('status', '==', 'active')
        .orderBy('year', 'desc')
        .limit(1)
        .get();
      if (!act.empty) yearToUse = Number(act.docs[0].get('year'));
    }
    if (!yearToUse)
      throw new functions.https.HttpsError(
        'failed-precondition',
        'No active membership to resend'
      );

    const verifyUrl = `https://interdomestik.app/verify?memberNo=${encodeURIComponent(memberNo)}`;
    const html = membershipCardHtml({
      memberNo,
      name,
      region,
      validity: String(yearToUse),
      verifyUrl,
    });
    await queueEmail({
      to: [email],
      subject: `Interdomestik Membership ${yearToUse}`,
      html,
    });

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

// Card token management (admin only)
export const getCardKeyStatusCallable = functions
  .region(REGION)
  .https.onCall(async (_data, context) => {
    if (!context.auth || (context.auth.token as any)?.role !== 'admin') {
      throw new functions.https.HttpsError('permission-denied', 'Admin only');
    }
    const s = getCardKeyStatus();
    return s;
  });

export const revokeCardToken = functions
  .region(REGION)
  .https.onCall(async (data, context) => {
    if (!context.auth || (context.auth.token as any)?.role !== 'admin') {
      throw new functions.https.HttpsError('permission-denied', 'Admin only');
    }
    const jti = String(data?.jti || '').trim();
    const reason = String(data?.reason || '').trim();
    if (!/^[-_A-Za-z0-9]{6,}$/.test(jti)) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid jti');
    }
    await db
      .collection('card_revocations')
      .doc(jti)
      .set(
        {
          reason: reason || 'manual',
          by: context.auth.uid,
          createdAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    return { ok: true };
  });

// HTTP utilities -------------------------------------------------------------
export const clearDatabase = functions
  .region(REGION)
  .https.onRequest(async (req, res): Promise<void> => {
    try {
      // CORS for local tools
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      if (req.method === 'OPTIONS') {
        res.status(204).end();
        return;
      }

      // Guard: allow only on emulator and only for admin users
      const isEmulator = !!process.env.FUNCTIONS_EMULATOR;
      if (!isEmulator) {
        res.status(403).json({ ok: false, error: 'forbidden' });
        return;
      }
      const authHeader = (req.headers['authorization'] ||
        req.headers['Authorization']) as string | undefined;
      const emuBypass = String(
        (req.headers['x-emulator-admin'] ||
          req.headers['X-Emulator-Admin'] ||
          '') as string
      ).toLowerCase();
      const emuBypassOk = emuBypass === 'true' || emuBypass === '1';
      let isAdmin = false;
      if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
        const idToken = authHeader.slice(7);
        try {
          const decoded = await admin.auth().verifyIdToken(idToken, true);
          isAdmin = (decoded as any)?.role === 'admin';
        } catch {
          isAdmin = false;
        }
      }
      if (!(isAdmin || (isEmulator && emuBypassOk))) {
        res.status(403).json({ ok: false, error: 'admin-required' });
        return;
      }

      const auth = admin.auth();
      const listUsersResult = await auth.listUsers();
      await Promise.all(
        listUsersResult.users.map((user) => auth.deleteUser(user.uid))
      );

      const membersSnapshot = await db.collection('members').get();
      await Promise.all(membersSnapshot.docs.map((d) => d.ref.delete()));

      res.status(200).send('Database cleared successfully.');
    } catch (error: unknown) {
      log('clear_db_error', { error: String(error) });
      if (error instanceof Error)
        res.status(500).send(`Error clearing database: ${error.message}`);
      else
        res
          .status(500)
          .send('An unknown error occurred during database clearing.');
    }
  });

export const verifyMembership = functions
  .runWith({ memory: '256MB', timeoutSeconds: 30 })
  .region(REGION)
  .https.onRequest(
    async (
      req: functions.https.Request,
      res: functions.Response
    ): Promise<void> => {
      // Basic CORS for GET
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.set('Access-Control-Allow-Headers', 'Content-Type');
      if (req.method === 'OPTIONS') {
        res.status(200).send('ok');
        return;
      }
      if (req.method !== 'GET') {
        res.status(405).json({ ok: false, error: 'Method not allowed' });
        return;
      }

      try {
        // API key auth: if present and valid for 'verify', bypass rate limit and respond minimally
        const apiKey = (
          req.headers?.['x-api-key'] as string | undefined
        )?.trim();
        let apiKeyValid = false;
        if (apiKey) {
          try {
            const crypto = await import('crypto');
            const hash = crypto
              .createHash('sha256')
              .update(apiKey)
              .digest('hex');
            const q = await db
              .collection('api_keys')
              .where('hash', '==', hash)
              .where('active', '==', true)
              .limit(1)
              .get();
            if (!q.empty) {
              const scopes = (q.docs[0].get('scopes') as string[]) || [];
              apiKeyValid = scopes.includes('verify');
            }
          } catch {}
        }

        // Optional captcha (prod only if configured)
        const isEmu = !!(
          process.env.FUNCTIONS_EMULATOR ||
          process.env.FIREBASE_EMULATOR_HUB ||
          process.env.FIRESTORE_EMULATOR_HOST
        );
        const recaptchaSecret = process.env.RECAPTCHA_SECRET as
          | string
          | undefined;
        if (!isEmu && recaptchaSecret) {
          const token = String(req.headers['x-recaptcha-token'] || '').trim();
          if (!token) {
            res.status(400).json({ ok: false, error: 'captcha-required' });
            return;
          }
          try {
            const params = new URLSearchParams({
              secret: recaptchaSecret,
              response: token,
            });
            const r = await fetch(
              'https://www.google.com/recaptcha/api/siteverify',
              { method: 'POST', body: params as any }
            );
            const json: any = await r.json();
            if (!json?.success) {
              res.status(400).json({ ok: false, error: 'captcha-invalid' });
              return;
            }
          } catch (e) {
            log('verify_captcha_error', { error: String(e) });
            res.status(400).json({ ok: false, error: 'captcha-error' });
            return;
          }
        }

        // Simple IP-based rate limiting (skips emulator/tests or valid API key). Limits: 60/minute or 1000/day
        if (!isEmu && !apiKeyValid) {
          const fwd = String(req.headers['x-forwarded-for'] || '')
            .split(',')[0]
            .trim();
          const ip =
            fwd ||
            (req as any).ip ||
            (req.socket && (req.socket as any).remoteAddress) ||
            'unknown';
          const crypto = await import('node:crypto');
          const hash = crypto
            .createHash('sha256')
            .update(String(ip))
            .digest('hex')
            .slice(0, 12);
          const now = new Date();
          const dayKey = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}${String(now.getUTCDate()).padStart(2, '0')}`;
          const minuteKey = Math.floor(now.getTime() / 60000); // epoch minute
          const ref = db
            .collection('ratelimit_verify')
            .doc(`${dayKey}-${hash}`);
          let limited = false;
          await db.runTransaction(async (tx) => {
            const snap = await tx.get(ref);
            const data = snap.exists ? (snap.data() as any) : {};
            const prevMinuteKey = Number(data.minuteKey || 0);
            const prevMinuteCount = Number(data.minuteCount || 0);
            const prevDayCount = Number(data.dayCount || 0);
            const minuteCount =
              prevMinuteKey === minuteKey ? prevMinuteCount + 1 : 1;
            const dayCount = prevDayCount + 1;
            if (minuteCount > 60 || dayCount > 1000) {
              limited = true;
            }
            tx.set(
              ref,
              {
                minuteKey,
                minuteCount,
                dayCount,
                updatedAt: FieldValue.serverTimestamp(),
              },
              { merge: true }
            );
          });
          if (limited) {
            log('verify_rate_limited', { ipHash: hash });
            res.status(429).json({ ok: false, error: 'Too many requests' });
            return;
          }
        }

        const token = String(req.query.token ?? '').trim();
        let memberNo: string = String(req.query.memberNo ?? '').trim();
        if (token && !memberNo) {
          try {
            const { verifyCardToken } = await import('./lib/tokens');
            const claims = verifyCardToken(token);
            if (claims && typeof (claims as any).mno === 'string') {
              memberNo = String((claims as any).mno);
              // Optional: check revocation list
              const jti = (claims as any).jti as string | undefined;
              if (jti) {
                const revoked = await db
                  .collection('card_revocations')
                  .doc(jti)
                  .get();
                if (revoked.exists) {
                  res.json({
                    ok: true,
                    valid: false,
                    memberNo,
                    reason: 'revoked',
                  });
                  return;
                }
              }
            }
          } catch {}
        }

        if (!memberNo) {
          res.status(400).json({ ok: false, error: 'memberNo required' });
          return;
        }

        if (!/^INT-\d{4}-\d{6}$/.test(memberNo)) {
          res.json({ ok: true, valid: false, memberNo });
          return;
        }

        const q = await db
          .collection('members')
          .where('memberNo', '==', memberNo)
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
          const snapAct = await db
            .collection('members')
            .doc(doc.id)
            .collection('memberships')
            .where('status', '==', 'active')
            .limit(5)
            .get();
          const nowMs = Date.now();
          for (const d of snapAct.docs) {
            const exp: any = d.get('expiresAt');
            if (!exp) {
              isValid = true;
              break;
            }
            const ms =
              typeof exp?.toMillis === 'function'
                ? exp.toMillis()
                : typeof exp?.seconds === 'number'
                  ? exp.seconds * 1000
                  : 0;
            if (ms > nowMs) {
              isValid = true;
              break;
            }
          }
        } catch {
          // Defensive: avoid 500 in tests/emulator
          isValid = false;
        }

        if (apiKeyValid) {
          res.json({ ok: true, valid: isValid, memberNo });
        } else {
          res.json({
            ok: true,
            valid: isValid,
            memberNo,
            name: (doc.get('name') as string) || 'Member',
            region: (doc.get('region') as string) || '—',
          });
        }
        return;
      } catch (e) {
        log('verify_error', { error: String(e) });
        res.status(500).json({ ok: false, error: String(e) });
        return;
      }
    }
  );

// Stripe webhook (emulator-friendly placeholder). In production, add signature verification.
export const stripeWebhook = functions
  .runWith({ memory: '256MB', timeoutSeconds: 30 })
  .region(REGION)
  .https.onRequest(async (req, res): Promise<void> => {
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
      const sig = (req as any)?.headers
        ? ((req as any).headers['stripe-signature'] as string | undefined)
        : undefined;
      const isStripeMode = !!(signingSecret && sig);

      if (isStripeMode) {
        // Verify signature and construct event
        // Indirect dynamic import to avoid hard dependency in test/emulator without package
        const Stripe = (
          await (Function('m', 'return import(m)') as any)('stripe')
        ).default;
        const stripe = new Stripe(process.env.STRIPE_API_KEY || '', {
          apiVersion: '2024-06-20' as any,
        });
        let event: any;
        try {
          event = stripe.webhooks.constructEvent(
            req.rawBody,
            sig!,
            signingSecret!
          );
        } catch (err) {
          log('stripe_webhook_signature_failed', { error: String(err) });
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
          if (!uid) {
            res.status(400).send('metadata.uid missing');
            return;
          }
          const invoiceId: string = inv.id || `inv_${Date.now()}`;
          const amount: number = Number(inv.amount_paid || inv.amount_due || 0);
          const currency: string = (inv.currency || 'eur').toUpperCase();
          const created: Timestamp = Timestamp.fromMillis(
            (inv.created || Math.floor(Date.now() / 1000)) * 1000
          );
          await db.runTransaction(async (tx) => {
            const invRef = db
              .collection('billing')
              .doc(uid)
              .collection('invoices')
              .doc(invoiceId);
            tx.set(
              invRef,
              { invoiceId, amount, currency, created, status: 'paid' },
              { merge: true }
            );
            tx.set(
              eventDoc,
              {
                processed: true,
                type: event.type,
                at: FieldValue.serverTimestamp(),
              },
              { merge: true }
            );
          });
          // Activate membership for current (or configured) year
          const envYear = Number(process.env.MEMBER_YEAR);
          const year =
            !Number.isNaN(envYear) && envYear >= 2020 && envYear <= 2100
              ? envYear
              : new Date().getUTCFullYear();
          try {
            await activateMembership(
              uid,
              year,
              amount / 100,
              currency,
              'card',
              invoiceId
            );
            // Send card + receipt emails
            try {
              const m = await db.collection('members').doc(uid).get();
              const email = m.get('email') as string | undefined;
              const name = (m.get('name') as string | undefined) || 'Member';
              const memberNo = m.get('memberNo') as string | undefined;
              const region = (m.get('region') as string | undefined) || '—';
              if (email && memberNo) {
                const token = signCardToken({
                  mno: memberNo,
                  exp: Math.floor(
                    new Date(year, 11, 31, 23, 59, 59).getTime() / 1000
                  ),
                });
                const verifyUrl = `https://interdomestik.app/verify?token=${token}`;
                const html = membershipCardHtml({
                  memberNo,
                  name,
                  region,
                  validity: String(year),
                  verifyUrl,
                });
                await queueEmail({
                  to: [email],
                  subject: `Interdomestik Membership ${year}`,
                  html,
                });
                await sendPaymentReceipt({
                  email,
                  name,
                  memberNo,
                  amount: amount / 100,
                  currency,
                  method: 'card',
                  reference: invoiceId,
                });
              }
            } catch (e) {
              log('stripe_email_error', { error: String(e), uid });
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
            log('stripe_activate_error', { error: String(e), uid });
          }
          res.json({ ok: true });
          return;
        }

        // Unhandled event types acknowledged
        await eventDoc.set(
          {
            processed: true,
            type: event.type,
            at: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
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
      const created = body.created
        ? Timestamp.fromDate(new Date(body.created))
        : Timestamp.now();
      await db
        .collection('billing')
        .doc(uid)
        .collection('invoices')
        .doc(invoiceId)
        .set(
          {
            invoiceId,
            amount,
            currency,
            created,
            status: 'paid',
          },
          { merge: true }
        );
      // Emulator path: also activate membership directly
      try {
        const envYear = Number(process.env.MEMBER_YEAR);
        const year =
          !Number.isNaN(envYear) && envYear >= 2020 && envYear <= 2100
            ? envYear
            : new Date().getUTCFullYear();
        await activateMembership(
          uid,
          year,
          amount / 100,
          currency,
          'card',
          invoiceId
        );
        // Also send the membership card email in emulator mode for end-to-end UX
        try {
          const m = await db.collection('members').doc(uid).get();
          const email = m.get('email') as string | undefined;
          const name = (m.get('name') as string | undefined) || 'Member';
          const memberNo = m.get('memberNo') as string | undefined;
          const region = (m.get('region') as string | undefined) || '—';
          if (email && memberNo) {
            const token = signCardToken({
              mno: memberNo,
              exp: Math.floor(
                new Date(year, 11, 31, 23, 59, 59).getTime() / 1000
              ),
            });
            const verifyUrl = `https://interdomestik.app/verify?token=${token}`;
            const html = membershipCardHtml({
              memberNo,
              name,
              region,
              validity: String(year),
              verifyUrl,
            });
            await queueEmail({
              to: [email],
              subject: `Interdomestik Membership ${year}`,
              html,
            });
            await sendPaymentReceipt({
              email,
              name,
              memberNo,
              amount: amount / 100,
              currency,
              method: 'card',
              reference: invoiceId,
            });
          }
        } catch (e) {
          log('stripe_emulator_email_error', { error: String(e), uid });
        }
      } catch (e) {
        log('stripe_emulator_activate_error', { error: String(e), uid });
      }
      res.json({ ok: true, mode: 'emulator' });
    } catch (e) {
      log('stripe_webhook_error', { error: String(e) });
      res.status(500).json({ ok: false, error: String(e) });
    }
  });

if (process.env.FUNCTIONS_EMULATOR) {
  // Export a seed function only in emulator mode
  exports.seedDatabase = functions
    .region(REGION)
    .https.onRequest(async (req, res) => {
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

        const upsertMember = async (
          uid: string,
          data: Record<string, unknown>
        ) => {
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
        const agents: Array<{ uid: string; email: string; regions: string[] }> =
          [];
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
          createdAt: Timestamp.now(),
        });
        await db.collection('events').add({
          title: 'Volunteer day',
          startAt: Timestamp.fromDate(new Date(Date.now() + 21 * 86400000)),
          location: 'PEJA',
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
          const createdAt = Timestamp.fromDate(
            new Date(Date.now() - i * 864000)
          );
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
            await activateMembership(
              user.uid,
              yearNow,
              25,
              'EUR',
              'cash',
              null
            );
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
      const target = new Date(
        Date.UTC(
          today.getUTCFullYear(),
          today.getUTCMonth(),
          today.getUTCDate() + days
        )
      );
      const start = new Date(
        Date.UTC(
          target.getUTCFullYear(),
          target.getUTCMonth(),
          target.getUTCDate(),
          0,
          0,
          0
        )
      );
      const end = new Date(
        Date.UTC(
          target.getUTCFullYear(),
          target.getUTCMonth(),
          target.getUTCDate(),
          23,
          59,
          59
        )
      );
      const startTs = admin.firestore.Timestamp.fromDate(start);
      const endTs = admin.firestore.Timestamp.fromDate(end);

      const q = await db
        .collection('members')
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
    log('cleanup_stats', {
      audit_deleted: aud.deleted,
      metrics_deleted: met.deleted,
    });
  });

// Monthly membership report aggregation for previous month
export const monthlyMembershipReport = functions
  .region(REGION)
  .pubsub.schedule('10 0 1 * *') // 00:10 UTC on the 1st of each month
  .timeZone('UTC')
  .onRun(async () => {
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = now.getUTCMonth();
    const prev = new Date(
      Date.UTC(m === 0 ? y - 1 : y, m === 0 ? 11 : m - 1, 1)
    );
    const year = prev.getUTCFullYear();
    const month = prev.getUTCMonth() + 1;
    const monthKey = `${year}-${String(month).padStart(2, '0')}`;
    const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
    const end = new Date(Date.UTC(year, month, 0, 23, 59, 59));
    const startTs = admin.firestore.Timestamp.fromDate(start);
    const endTs = admin.firestore.Timestamp.fromDate(end);

    const q = await db
      .collection('audit_logs')
      .where('action', '==', 'startMembership')
      .where('ts', '>=', startTs)
      .where('ts', '<=', endTs)
      .get();
    let total = 0;
    let revenue = 0;
    const byRegion: Record<string, number> = {};
    const byMethod: Record<string, number> = {};
    q.forEach((d) => {
      total += 1;
      const amt = Number(d.get('amount') || 0);
      revenue += isFinite(amt) ? amt : 0;
      const reg = String(d.get('region') || 'UNKNOWN');
      byRegion[reg] = (byRegion[reg] || 0) + 1;
      const meth = String(d.get('method') || 'unknown');
      byMethod[meth] = (byMethod[meth] || 0) + 1;
    });

    await db
      .collection('reports')
      .doc(`monthly-${monthKey}`)
      .set(
        {
          type: 'monthly',
          month: monthKey,
          range: { start: startTs, end: endTs },
          total,
          revenue,
          byRegion,
          byMethod,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
  });

// CSV export for monthly report (admin only)
export const exportMonthlyReport = functions
  .runWith({ memory: '256MB', timeoutSeconds: 60 })
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
    const doc = await db.collection('reports').doc(`monthly-${month}`).get();
    if (!doc.exists) {
      res.status(404).send('Report not found');
      return;
    }
    const data = doc.data() as any;
    const rows: string[] = [];
    rows.push('metric,value');
    rows.push(`total,${data.total || 0}`);
    rows.push(`revenue,${data.revenue || 0}`);
    rows.push('');
    rows.push('region,count');
    const byRegion = data.byRegion || {};
    for (const k of Object.keys(byRegion)) rows.push(`${k},${byRegion[k]}`);
    rows.push('');
    rows.push('method,count');
    const byMethod = data.byMethod || {};
    for (const k of Object.keys(byMethod)) rows.push(`${k},${byMethod[k]}`);
    const csv = rows.join('\n');
    res.set('Content-Type', 'text/csv');
    res.set('Content-Disposition', `attachment; filename=monthly-${month}.csv`);
    res.status(200).send(csv);
  });

// On-demand monthly report generation (admin only, callable)
export const generateMonthlyReportNow = functions
  .region(REGION)
  .https.onCall(async (data, context) => {
    if (!context.auth || (context.auth.token as any)?.role !== 'admin') {
      throw new functions.https.HttpsError('permission-denied', 'Admin only');
    }
    const month = String(data?.month || '').trim(); // YYYY-MM or '' => previous month
    let target: string;
    if (/^\d{4}-\d{2}$/.test(month)) {
      target = month;
    } else {
      const now = new Date();
      const y = now.getUTCFullYear();
      const m = now.getUTCMonth();
      const prev = new Date(
        Date.UTC(m === 0 ? y - 1 : y, m === 0 ? 11 : m - 1, 1)
      );
      target = `${prev.getUTCFullYear()}-${String(prev.getUTCMonth() + 1).padStart(2, '0')}`;
    }
    const [year, monthNum] = target.split('-').map((x) => Number(x));
    const start = new Date(Date.UTC(year, monthNum - 1, 1, 0, 0, 0));
    const end = new Date(Date.UTC(year, monthNum, 0, 23, 59, 59));
    const startTs = admin.firestore.Timestamp.fromDate(start);
    const endTs = admin.firestore.Timestamp.fromDate(end);
    const q = await db
      .collection('audit_logs')
      .where('action', '==', 'startMembership')
      .where('ts', '>=', startTs)
      .where('ts', '<=', endTs)
      .get();
    let total = 0;
    let revenue = 0;
    const byRegion: Record<string, number> = {};
    const byMethod: Record<string, number> = {};
    q.forEach((d) => {
      total += 1;
      const amt = Number(d.get('amount') || 0);
      revenue += isFinite(amt) ? amt : 0;
      const reg = String(d.get('region') || 'UNKNOWN');
      byRegion[reg] = (byRegion[reg] || 0) + 1;
      const meth = String(d.get('method') || 'unknown');
      byMethod[meth] = (byMethod[meth] || 0) + 1;
    });
    await db
      .collection('reports')
      .doc(`monthly-${target}`)
      .set(
        {
          type: 'monthly',
          month: target,
          range: { start: startTs, end: endTs },
          total,
          revenue,
          byRegion,
          byMethod,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    return { ok: true, month: target, total, revenue };
  });

// Async Members CSV export: writes to Storage, emails signed URL, and records status doc
export const startMembersExportLegacy = functions
  .runWith({ memory: '512MB', timeoutSeconds: 300 })
  .region(REGION)
  .https.onCall(async (_data, context) => {
    if (!context.auth || (context.auth.token as any)?.role !== 'admin') {
      throw new functions.https.HttpsError('permission-denied', 'Admin only');
    }
    const actor = context.auth.uid;
    const ts = new Date();
    const dateKey = `${ts.getUTCFullYear()}-${String(ts.getUTCMonth() + 1).padStart(2, '0')}-${String(ts.getUTCDate()).padStart(2, '0')}_${String(ts.getUTCHours()).padStart(2, '0')}${String(ts.getUTCMinutes()).padStart(2, '0')}`;
    const path = `exports/members/members_${dateKey}.csv`;
    const exportRef = db.collection('exports').doc();
    await exportRef.set(
      {
        type: 'members_csv',
        status: 'running',
        path,
        createdAt: FieldValue.serverTimestamp(),
        createdBy: actor,
      },
      { merge: true }
    );
    try {
      const { csv, count } = await generateMembersCsv();
      const { url, size } = await saveCsvToStorage(csv, path);
      await exportRef.set(
        {
          status: 'done',
          count,
          size,
          url,
          finishedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      // Send email to actor if we can resolve an email address from profile
      try {
        const m = await db.collection('members').doc(actor).get();
        const email = m.get('email') as string | undefined;
        if (email) {
          const subj = `Members CSV export — ${dateKey}`;
          const html = url
            ? `<p>Your export is ready. <a href="${url}">Download CSV</a></p>`
            : `<p>Your export is ready at: ${path} (no signed URL available)</p>`;
          await queueEmail({ to: [email], subject: subj, html });
        }
      } catch {}
      return { ok: true, id: exportRef.id, path, url, count };
    } catch (e) {
      await exportRef.set(
        {
          status: 'error',
          error: String(e),
          finishedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      throw new functions.https.HttpsError(
        'internal',
        'Export failed',
        String(e)
      );
    }
  });

// New async export pipeline (Phase 3)
export const startMembersExport = functions
  .runWith({ memory: '256MB', timeoutSeconds: 60 })
  .region(REGION)
  .https.onCall(async (data, context) => {
    try {
      if (!context.auth || (context.auth.token as any)?.role !== 'admin') {
        throw new functions.https.HttpsError('permission-denied', 'Admin only');
      }
      const actor = context.auth.uid;
      const running = await db
        .collection('exports')
        .where('createdBy', '==', actor)
        .where('status', '==', 'running')
        .get();
      if (running.size >= 2)
        throw new functions.https.HttpsError(
          'resource-exhausted',
          'Too many concurrent exports'
        );

      function tsSafe(input: any): admin.firestore.Timestamp | undefined {
        if (!input) return undefined;
        try {
          const d = input instanceof Date ? input : new Date(String(input));
          if (isNaN(d.getTime())) return undefined;
          return admin.firestore.Timestamp.fromDate(d);
        } catch {
          return undefined;
        }
      }
      const filters: any = {
        regions: Array.isArray(data?.filters?.regions)
          ? data.filters.regions.map((x: any) => String(x)).filter(Boolean)
          : undefined,
        status: data?.filters?.status ? String(data.filters.status) : undefined,
        orgId: data?.filters?.orgId ? String(data.filters.orgId) : undefined,
        expiringAfter: tsSafe(data?.filters?.expiringAfter),
        expiringBefore: tsSafe(data?.filters?.expiringBefore),
      };
      const presetRaw = String(data?.preset || 'BASIC').toUpperCase();
      const preset = presetRaw === 'FULL' ? 'FULL' : 'BASIC';
      const columns = normalizeColumns(
        Array.isArray(data?.columns)
          ? data.columns.map((c: any) => String(c))
          : undefined,
        preset as any
      );

      const exportRef = db.collection('exports').doc();
      await exportRef.set(
        {
          type: 'members_csv',
          status: 'pending',
          createdAt: FieldValue.serverTimestamp(),
          createdBy: actor,
          filters,
          columns,
          progress: { rows: 0, bytes: 0 },
        },
        { merge: true }
      );
      return { ok: true, id: exportRef.id };
    } catch (e) {
      // Map unknown errors to HttpsError with details for easier debugging in UI
      const msg =
        e instanceof functions.https.HttpsError ? e.message : String(e);
      if (e instanceof functions.https.HttpsError) throw e;
      throw new functions.https.HttpsError(
        'internal',
        `startMembersExport failed: ${msg}`
      );
    }
  });

export const exportsWorkerOnCreate = functions
  .runWith({ memory: '512MB', timeoutSeconds: 300 })
  .region(REGION)
  .firestore.document('exports/{exportId}')
  .onCreate(async (snap, context) => {
    const id = context.params.exportId as string;
    const data = snap.data() as any;
    if (!data || data.type !== 'members_csv' || data.status !== 'pending')
      return;
    const actor = String(data.createdBy || '');
    const ts = new Date();
    const dateKey = `${ts.getUTCFullYear()}-${String(ts.getUTCMonth() + 1).padStart(2, '0')}-${String(ts.getUTCDate()).padStart(2, '0')}_${String(ts.getUTCHours()).padStart(2, '0')}${String(ts.getUTCMinutes()).padStart(2, '0')}`;
    const path = data.path || `exports/members/members_${dateKey}_${id}.csv`;
    const ref = db.collection('exports').doc(id);
    await ref.set(
      { status: 'running', path, startedAt: FieldValue.serverTimestamp() },
      { merge: true }
    );
    try {
      const { rows, size, url } = await streamMembersCsv({
        exportId: id,
        filters: data.filters || {},
        columns: data.columns || [],
        actorUid: actor,
        path,
      });
      await ref.set(
        {
          status: 'success',
          count: rows,
          size,
          url,
          finishedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      try {
        const m = await db.collection('members').doc(actor).get();
        const email = m.get('email') as string | undefined;
        if (email) {
          const subj = `Members CSV export — ${dateKey}`;
          const html = url
            ? `<p>Your export is ready. <a href=\"${url}\">Download CSV</a></p>`
            : `<p>Your export is ready at: ${path} (no signed URL available)</p>`;
          await queueEmail({ to: [email], subject: subj, html });
        }
      } catch {}
    } catch (e) {
      await ref.set(
        {
          status: 'error',
          error: String(e),
          finishedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }
  });

// (removed duplicate token helper exports)

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
