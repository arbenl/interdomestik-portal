import * as functions from 'firebase-functions/v1';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { db } from '../firebaseAdmin';
import { log } from './logger';

const MAX_MESSAGES_PER_USER = 20;
const MAX_TELEMETRY_ENTRIES = 250;

type AssistantResponse = {
  reply: string;
  followUps: string[];
  fallback: boolean;
};

const RENEWAL_MESSAGE =
  'You can renew a membership from the Membership panel. Review expiry dates, update payment method, then confirm the renewal. Let me know if you need the step-by-step checklist.';
const BILLING_MESSAGE =
  'Billing records live under Billing > Invoices. You can simulate a payment via the admin tools or review Stripe webhook history. Need help reconciling an invoice?';
const EVENTS_MESSAGE =
  'Upcoming events are managed from the Events area. Use the filters to target a region, then share the registration link with members.';
const SECURITY_MESSAGE =
  'Admins can enforce MFA from the security settings (coming soon). For now, remind staff to enroll and review audit logs in the Admin > Audit panel.';
const EXPORT_MESSAGE =
  'Exports run from Admin > Exports. Start a CSV, then monitor progress from the job list. I can help you pick the right preset if you tell me what columns you need.';

function buildAssistantResponse(prompt: string, role: string | undefined): AssistantResponse {
  const normalized = prompt.toLowerCase();
  const followUps: string[] = [];

  if (normalized.includes('renew') || normalized.includes('expiry') || normalized.includes('expire')) {
    followUps.push('Show renewal checklist', 'Remind members with upcoming expirations');
    return { reply: RENEWAL_MESSAGE, followUps, fallback: false };
  }

  if (normalized.includes('invoice') || normalized.includes('payment') || normalized.includes('billing')) {
    followUps.push('Open billing simulator', 'Explain invoice statuses');
    return { reply: BILLING_MESSAGE, followUps, fallback: false };
  }

  if (normalized.includes('event') || normalized.includes('meeting')) {
    followUps.push('List upcoming events', 'Create a new draft event');
    return { reply: EVENTS_MESSAGE, followUps, fallback: false };
  }

  if (normalized.includes('security') || normalized.includes('mfa') || normalized.includes('two-factor')) {
    followUps.push('Review MFA rollout plan', 'List recent security alerts');
    return { reply: SECURITY_MESSAGE, followUps, fallback: false };
  }

  if (normalized.includes('export') || normalized.includes('download') || normalized.includes('csv')) {
    followUps.push('Start members export', 'Share export troubleshooting steps');
    return { reply: EXPORT_MESSAGE, followUps, fallback: false };
  }

  if (role === 'member') {
    followUps.push('Show billing summary', 'Update my profile');
    return {
      reply: 'I can help you check your membership status, download your digital card, or review payments. Ask about renewals, billing, or events to get started.',
      followUps,
      fallback: true,
    };
  }

  followUps.push('Renewals guidance', 'Billing tips', 'Security roadmap');
  return {
    reply: 'Need assistance with renewals, billing records, exports, or security? Ask me about a task and I will walk you through the recommended workflow.',
    followUps,
    fallback: true,
  };
}

async function trimOldMessages(uid: string): Promise<void> {
  const messagesRef = db.collection('assistantSessions').doc(uid).collection('messages');
  const snapshot = await messagesRef.orderBy('createdAt', 'desc').offset(MAX_MESSAGES_PER_USER).get();
  const deletions = snapshot.docs.map(doc => doc.ref.delete());
  await Promise.all(deletions);
}

async function trimOldTelemetry(): Promise<void> {
  const snapshot = await db
    .collection('assistantTelemetry')
    .orderBy('createdAt', 'desc')
    .offset(MAX_TELEMETRY_ENTRIES)
    .limit(50)
    .get();
  if (snapshot.empty) return;
  await Promise.all(snapshot.docs.map(doc => doc.ref.delete()));
}

async function recordAssistantTelemetry(params: {
  uid: string;
  role: string;
  latencyMs: number;
  fallback: boolean;
  promptLength: number;
  sessionRef: string;
  messageRef: string;
}) {
  const telemetryRef = db.collection('assistantTelemetry');
  await telemetryRef.add({
    uid: params.uid,
    role: params.role,
    latencyMs: params.latencyMs,
    fallback: params.fallback,
    promptLength: params.promptLength,
    sessionRef: params.sessionRef,
    messageRef: params.messageRef,
    createdAt: FieldValue.serverTimestamp(),
  });
  await trimOldTelemetry();
}

export async function startAssistantSuggestionLogic(data: unknown, context: functions.https.CallableContext) {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Sign in to use the portal assistant.');
  }

  const startedAt = Date.now();
  const prompt = String((data as Record<string, unknown>)?.prompt ?? '').trim();
  if (!prompt) {
    throw new functions.https.HttpsError('invalid-argument', 'prompt is required');
  }

  const uid = context.auth.uid;
  const role = String((context.auth.token as Record<string, unknown>)?.role ?? 'member');
  const sessionRef = db.collection('assistantSessions').doc(uid);
  const messagesRef = sessionRef.collection('messages');

  const userMessage = {
    role: 'user' as const,
    content: prompt,
    createdAt: FieldValue.serverTimestamp(),
  };

  await Promise.all([
    sessionRef.set({
      uid,
      updatedAt: FieldValue.serverTimestamp(),
      lastPrompt: prompt,
      role,
    }, { merge: true }),
    messagesRef.add(userMessage),
  ]);

  const response = buildAssistantResponse(prompt, role);
  const assistantMessage = {
    role: 'assistant' as const,
    content: response.reply,
    followUps: response.followUps,
    createdAt: FieldValue.serverTimestamp(),
  };

  const replyDoc = await messagesRef.add(assistantMessage);
  await trimOldMessages(uid);

  const latencyMs = Date.now() - startedAt;

  const metricsUpdate: Record<string, unknown> = {
    lastPrompt: prompt,
    role,
    updatedAt: FieldValue.serverTimestamp(),
    'metrics.lastLatencyMs': latencyMs,
    'metrics.lastFallback': response.fallback,
    'metrics.totalLatencyMs': FieldValue.increment(latencyMs),
    'metrics.requestCount': FieldValue.increment(1),
  };
  if (response.fallback) {
    metricsUpdate['metrics.fallbackCount'] = FieldValue.increment(1);
  }

  await Promise.all([
    sessionRef.update(metricsUpdate),
    recordAssistantTelemetry({
      uid,
      role,
      latencyMs,
      fallback: response.fallback,
      promptLength: prompt.length,
      sessionRef: sessionRef.path,
      messageRef: replyDoc.path,
    }),
  ]);

  log('assistant_invocation', {
    uid,
    role,
    latencyMs,
    fallback: response.fallback,
    messageRef: replyDoc.path,
  });

  return {
    reply: response.reply,
    followUps: response.followUps,
    messageRef: replyDoc.path,
    generatedAt: Timestamp.now().toDate().toISOString(),
    latencyMs,
    fallback: response.fallback,
  };
}
