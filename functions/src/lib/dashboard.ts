import * as functions from 'firebase-functions/v1';
import { admin, db } from '../firebaseAdmin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';

export type PortalWidgetId = 'renewalsDue' | 'paymentsCaptured' | 'eventRegistrations' | 'churnRisk';

export type PortalWidgetSummary = {
  id: PortalWidgetId;
  title: string;
  value: string;
  helper: string;
  trend?: 'up' | 'down' | 'flat';
  delta?: string;
};

export type PortalDashboardPayload = {
  generatedAt: string;
  widgets: PortalWidgetSummary[];
};

export type PortalLayoutItem = {
  id: PortalWidgetId;
  hidden?: boolean;
};

export type PortalLayoutDocument = {
  uid: string;
  widgets: PortalLayoutItem[];
  updatedAt: FirebaseFirestore.Timestamp;
  updatedBy: string;
  version: 1;
};

const SUPPORTED_WIDGETS: PortalWidgetId[] = ['renewalsDue', 'paymentsCaptured', 'eventRegistrations', 'churnRisk'];

const formatCurrency = (amount: number) =>
  amount.toLocaleString('en-US', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 });

const DEFAULT_LAYOUT: PortalLayoutItem[] = [
  { id: 'renewalsDue' },
  { id: 'paymentsCaptured' },
  { id: 'eventRegistrations' },
  { id: 'churnRisk' },
];


function assertAuthorized(context: functions.https.CallableContext) {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
  }
  const role = String((context.auth.token as any)?.role || 'member');
  if (role !== 'admin' && role !== 'agent') {
    throw new functions.https.HttpsError('permission-denied', 'Portal dashboard available to admins or agents only');
  }
  return { role, allowedRegions: normalizeRegions((context.auth.token as any)?.allowedRegions) };
}

function normalizeRegions(regions: unknown): string[] {
  if (!Array.isArray(regions)) return [];
  return regions
    .map(entry => (typeof entry === 'string' ? entry : String(entry ?? '')).trim())
    .filter(Boolean)
    .slice(0, 10); // Firestore `in` filter supports up to 10 values
}

async function countRenewalsDue(allowedRegions: string[] | null): Promise<{ value: number; helper: string }>
{
  const now = Timestamp.now();
  const thresholdDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const threshold = Timestamp.fromDate(thresholdDate);

  let query = db.collection('members')
    .where('status', '==', 'active')
    .where('expiresAt', '>=', now)
    .where('expiresAt', '<=', threshold);

  if (allowedRegions && allowedRegions.length > 0) {
    query = query.where('region', 'in', allowedRegions);
  }

  const snapshot = await query.count().get();
  const total = snapshot.data().count;
  const helper = total === 0
    ? 'No renewals due in the next 30 days'
    : `Contact the ${total === 1 ? 'member' : 'members'} before expiry`;
  return { value: total, helper };
}

async function sumRecentPayments(allowedRegions: string[] | null): Promise<{ value: number; helper: string; delta: string; trend: 'up' | 'down' | 'flat' }>
{
  const now = Date.now();
  const sevenDaysAgo = Timestamp.fromDate(new Date(now - 7 * 24 * 60 * 60 * 1000));
  const fourteenDaysAgo = Timestamp.fromDate(new Date(now - 14 * 24 * 60 * 60 * 1000));

  let baseQuery = db.collection('audit_logs')
    .where('action', '==', 'startMembership');

  if (allowedRegions && allowedRegions.length > 0) {
    baseQuery = baseQuery.where('region', 'in', allowedRegions);
  }

  const recentSnap = await baseQuery.where('ts', '>=', sevenDaysAgo).get();
  const priorSnap = await baseQuery
    .where('ts', '>=', fourteenDaysAgo)
    .where('ts', '<', sevenDaysAgo)
    .get();

  const recentAmount = recentSnap.docs.reduce((sum, doc) => sum + Number(doc.get('amount') || 0), 0);
  const priorAmount = priorSnap.docs.reduce((sum, doc) => sum + Number(doc.get('amount') || 0), 0);

  const diff = recentAmount - priorAmount;
  let trend: 'up' | 'down' | 'flat' = 'flat';
  if (Math.abs(diff) >= 1) {
    trend = diff > 0 ? 'up' : 'down';
  }

  const delta = priorAmount === 0
    ? (recentAmount > 0 ? '+100%' : '0%')
    : `${((diff / priorAmount) * 100).toFixed(0)}%`;

  const helper = trend === 'flat'
    ? 'Stable vs. previous week'
    : `${trend === 'up' ? '↑' : '↓'} ${formatCurrency(Math.abs(diff))} vs. prior week`;

  return { value: recentAmount, helper, delta, trend };
}

async function countUpcomingEvents(): Promise<{ value: number; helper: string }>
{
  const now = Timestamp.now();
  const snapshot = await db.collection('events')
    .where('startAt', '>=', now)
    .orderBy('startAt', 'asc')
    .get();
  const total = snapshot.size;
  const helper = total === 0 ? 'No upcoming events scheduled' : `${total} upcoming ${total === 1 ? 'event' : 'events'} planned`;
  return { value: total, helper };
}

async function countChurnRisk(allowedRegions: string[] | null): Promise<{ value: number; helper: string }>
{
  let query = db.collection('members').where('status', '==', 'expired');
  if (allowedRegions && allowedRegions.length > 0) {
    query = query.where('region', 'in', allowedRegions);
  }
  const snapshot = await query.count().get();
  const total = snapshot.data().count;
  const helper = total === 0
    ? 'No members flagged as churn risk'
    : `${total} ${total === 1 ? 'profile' : 'profiles'} need renewal outreach`;
  return { value: total, helper };
}

export async function getPortalDashboardLogic(context: functions.https.CallableContext): Promise<PortalDashboardPayload> {
  const { allowedRegions } = assertAuthorized(context);
  const normalizedRegions = allowedRegions.length > 0 ? allowedRegions : null;

  const [renewals, payments, events, churn] = await Promise.all([
    countRenewalsDue(normalizedRegions),
    sumRecentPayments(normalizedRegions),
    countUpcomingEvents(),
    countChurnRisk(normalizedRegions),
  ]);

  const widgets: PortalWidgetSummary[] = [
    {
      id: 'renewalsDue',
      title: 'Renewals Due (30d)',
      value: String(renewals.value),
      helper: renewals.helper,
      trend: renewals.value > 0 ? 'up' : 'flat',
    },
    {
      id: 'paymentsCaptured',
      title: 'Payments Captured (7d)',
      value: formatCurrency(payments.value),
      helper: payments.helper,
      trend: payments.trend,
      delta: payments.delta,
    },
    {
      id: 'eventRegistrations',
      title: 'Upcoming Events',
      value: String(events.value),
      helper: events.helper,
      trend: events.value > 0 ? 'up' : 'flat',
    },
    {
      id: 'churnRisk',
      title: 'Churn Risk Profiles',
      value: String(churn.value),
      helper: churn.helper,
      trend: churn.value > 0 ? 'down' : 'flat',
    },
  ];

  return {
    generatedAt: new Date().toISOString(),
    widgets,
  };
}

function sanitizeLayout(input: unknown): PortalLayoutItem[] {
  if (!Array.isArray(input)) return DEFAULT_LAYOUT;
  const seen = new Set<PortalWidgetId>();
  const sanitized: PortalLayoutItem[] = [];
  for (const raw of input) {
    const id = (raw as any)?.id;
    if (!SUPPORTED_WIDGETS.includes(id)) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    sanitized.push({ id, hidden: Boolean((raw as any)?.hidden) });
  }
  for (const id of SUPPORTED_WIDGETS) {
    if (!seen.has(id)) {
      sanitized.push({ id });
    }
  }
  return sanitized;
}

export function getDefaultPortalLayout(): PortalLayoutItem[] {
  return DEFAULT_LAYOUT.map(item => ({ ...item }));
}

export async function getPortalLayoutLogic(context: functions.https.CallableContext): Promise<{ widgets: PortalLayoutItem[] }> {
  assertAuthorized(context);
  const uid = context.auth!.uid;
  const doc = await db.collection('portalLayouts').doc(uid).get();
  if (!doc.exists) {
    return { widgets: getDefaultPortalLayout() };
  }
  const data = doc.data() as Partial<PortalLayoutDocument> | undefined;
  const widgets = sanitizeLayout(data?.widgets);
  return { widgets };
}

export async function upsertPortalLayoutLogic(data: unknown, context: functions.https.CallableContext): Promise<{ widgets: PortalLayoutItem[] }> {
  assertAuthorized(context);
  const uid = context.auth!.uid;
  const widgets = sanitizeLayout((data as any)?.widgets);
  await db.collection('portalLayouts').doc(uid).set({
    uid,
    widgets,
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: uid,
    version: 1,
  }, { merge: true });
  return { widgets };
}
