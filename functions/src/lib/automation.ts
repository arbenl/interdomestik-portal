import * as functions from 'firebase-functions/v1';
import { db } from '../firebaseAdmin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { log } from './logger';

interface AutomationTarget {
  url: string;
  secret?: string;
  windowDays?: number;
}

interface RenewalConfig {
  enabled?: boolean;
  targets?: AutomationTarget[];
  lastRunAt?: FirebaseFirestore.Timestamp;
}

interface DispatchLogEntry {
  id?: string;
  url: string;
  windowDays: number;
  count: number;
  status: string;
  dispatchedAt: FirebaseFirestore.FieldValue;
  actor: string;
}

interface AutomationAlertParams {
  url: string;
  windowDays: number;
  count: number;
  status: string;
  actor: string;
  error?: string;
}

function parseStatus(status: string): number | null {
  const numeric = Number(status);
  if (!Number.isFinite(numeric)) return null;
  return numeric;
}

function isSuccessfulStatus(status: string): boolean {
  if (!status) return false;
  if (status.toLowerCase() === 'skipped') return true;
  const numeric = parseStatus(status);
  if (numeric === null) return false;
  return numeric >= 200 && numeric < 300;
}

async function recordAutomationAlert(
  params: AutomationAlertParams
): Promise<void> {
  const severity =
    params.status === 'error' || (parseStatus(params.status) ?? 0) >= 500
      ? 'critical'
      : 'warning';
  const message =
    params.error ??
    `Renewal webhook dispatch responded with status ${params.status}`;
  await db.collection('automationAlerts').add({
    url: params.url,
    windowDays: params.windowDays,
    count: params.count,
    status: params.status,
    actor: params.actor,
    severity,
    message,
    acknowledged: false,
    createdAt: FieldValue.serverTimestamp(),
  });
  log('automation_alert_recorded', {
    url: params.url,
    status: params.status,
    severity,
  });
}

export async function runRenewalHooks(
  context: functions.https.CallableContext | null
) {
  if (
    context &&
    (!context.auth || (context.auth.token as any)?.role !== 'admin')
  ) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Admin privileges required'
    );
  }

  const configSnap = await db
    .collection('automationHooks')
    .doc('renewals')
    .get();
  if (!configSnap.exists) {
    log('automation_renewals_missing_config', {});
    return { ok: true, dispatched: [] };
  }

  const data = configSnap.data() as RenewalConfig;
  if (
    !data.enabled ||
    !Array.isArray(data.targets) ||
    data.targets.length === 0
  ) {
    log('automation_renewals_disabled', {});
    return { ok: true, dispatched: [] };
  }

  const now = new Date();
  const dispatchedResults: Array<{
    url: string;
    windowDays: number;
    count: number;
    status: string;
  }> = [];
  const logEntries: DispatchLogEntry[] = [];

  for (const target of data.targets) {
    const windowDays = Math.max(
      1,
      Math.min(90, Number(target.windowDays ?? 30))
    );
    const windowDate = Timestamp.fromDate(
      new Date(Date.now() + windowDays * 24 * 60 * 60 * 1000)
    );

    let query = db
      .collection('members')
      .where('status', '==', 'active')
      .where('expiresAt', '>=', Timestamp.now())
      .where('expiresAt', '<=', windowDate)
      .limit(200);

    const snapshot = await query.get();
    const members = snapshot.docs.map((doc) => ({
      uid: doc.id,
      memberNo: doc.get('memberNo') ?? null,
      name: doc.get('name') ?? null,
      region: doc.get('region') ?? null,
      expiresAt: doc.get('expiresAt')?.toDate?.()?.toISOString?.() ?? null,
    }));

    if (members.length === 0) {
      dispatchedResults.push({
        url: target.url,
        windowDays,
        count: 0,
        status: 'skipped',
      });
      logEntries.push({
        url: target.url,
        windowDays,
        count: 0,
        status: 'skipped',
        dispatchedAt: FieldValue.serverTimestamp(),
        actor: context?.auth?.uid ?? 'automation',
      });
      continue;
    }

    try {
      const response = await fetch(target.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(target.secret
            ? { Authorization: `Bearer ${target.secret}` }
            : {}),
        },
        body: JSON.stringify({
          type: 'renewals.due',
          generatedAt: now.toISOString(),
          windowDays,
          count: members.length,
          members,
        }),
      });

      const statusText = `${response.status}`;
      dispatchedResults.push({
        url: target.url,
        windowDays,
        count: members.length,
        status: statusText,
      });
      logEntries.push({
        url: target.url,
        windowDays,
        count: members.length,
        status: statusText,
        dispatchedAt: FieldValue.serverTimestamp(),
        actor: context?.auth?.uid ?? 'automation',
      });
      log('automation_renewals_dispatch', {
        url: target.url,
        windowDays,
        count: members.length,
        status: statusText,
      });
      if (!isSuccessfulStatus(statusText)) {
        await recordAutomationAlert({
          url: target.url,
          windowDays,
          count: members.length,
          status: statusText,
          actor: context?.auth?.uid ?? 'automation',
        });
      }
    } catch (error) {
      dispatchedResults.push({
        url: target.url,
        windowDays,
        count: members.length,
        status: 'error',
      });
      logEntries.push({
        url: target.url,
        windowDays,
        count: members.length,
        status: 'error',
        dispatchedAt: FieldValue.serverTimestamp(),
        actor: context?.auth?.uid ?? 'automation',
      });
      log('automation_renewals_error', {
        url: target.url,
        error: String(error),
      });
      await recordAutomationAlert({
        url: target.url,
        windowDays,
        count: members.length,
        status: 'error',
        actor: context?.auth?.uid ?? 'automation',
        error: String(error),
      });
    }
  }

  await configSnap.ref.set(
    { lastRunAt: FieldValue.serverTimestamp() },
    { merge: true }
  );

  if (logEntries.length > 0) {
    const batch = db.batch();
    for (const entry of logEntries) {
      const ref = db.collection('automationLogs').doc();
      batch.set(ref, entry);
    }
    await batch.commit();
  }

  return { ok: true, dispatched: dispatchedResults };
}
