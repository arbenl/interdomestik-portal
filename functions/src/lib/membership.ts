import { admin, db } from '../firebaseAdmin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { log } from './logger';

const ORG_NAME = process.env.ORG_NAME || 'Interdomestik';
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'support@interdomestik.app';
const ORG_ADDRESS =
  process.env.ORG_ADDRESS || 'Interdomestik, Prishtina, Kosovo';

export interface MailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
  template?: { name: string; data?: Record<string, any> };
}

function isEmulator(): boolean {
  // FUNCTIONS_EMULATOR is set by legacy emulator; FIREBASE_EMULATOR_HUB is set by current suite
  return (
    process.env.FUNCTIONS_EMULATOR === 'true' ||
    !!process.env.FIREBASE_EMULATOR_HUB
  );
}

/**
 * Queue an email document for the Firebase "Trigger Email" extension.
 * See: https://firebase.google.com/products/extensions/mailchimp-trigger-email (or official Trigger Email docs)
 */
export async function queueEmail(mail: MailOptions): Promise<{ id: string }> {
  if (!mail.to) throw new Error("'to' is required");
  if (!mail.subject) throw new Error("'subject' is required");

  const doc = {
    to: mail.to,
    cc: mail.cc,
    bcc: mail.bcc,
    replyTo: mail.replyTo,
    message: {
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
    },
    template: mail.template, // optional, if your extension/template setup uses it
    createdAt: FieldValue.serverTimestamp(),
  } as const;

  const ref = await db.collection('mail').add(doc as any);

  if (isEmulator()) {
    // In emulator runs, no extension processes the document; log for visibility
    log('mail_queued', {
      id: ref.id,
      to: Array.isArray(doc.to) ? doc.to.join(',') : String(doc.to),
      subject: doc.message.subject,
    });
  }

  return { id: ref.id };
}

// Domain-specific helpers ----------------------------------------------------

export async function sendWelcomeEmail(opts: {
  email: string;
  name?: string;
  memberNo: string;
  expiry: string; // ISO or human date string
  verifyUrl: string;
  orgName?: string;
}): Promise<{ id: string }> {
  const name = opts.name ?? 'Member';
  const org = opts.orgName ?? ORG_NAME;
  const html = `
    <p>Hi ${escapeHtml(name)},</p>
    <p>Welcome to ${org}! Your membership is now active.</p>
    <ul>
      <li><b>Member No:</b> ${escapeHtml(opts.memberNo)}</li>
      <li><b>Valid until:</b> ${escapeHtml(opts.expiry)}</li>
    </ul>
    <p>You can verify your membership at any time here: <a href="${opts.verifyUrl}">${opts.verifyUrl}</a></p>
    <p>Thank you,<br/>${org}</p>
    <hr/>
    <p style="font-size:12px;color:#6b7280;">${org} • ${escapeHtml(ORG_ADDRESS)} • <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a></p>
  `;

  return queueEmail({
    to: opts.email,
    subject: `${org} — Membership Activated (${opts.memberNo})`,
    html,
    text: `Hi ${name},

Welcome to ${org}! Your membership is active.
Member No: ${opts.memberNo}
Valid until: ${opts.expiry}
Verify: ${opts.verifyUrl}

Thank you,
${org}`,
  });
}

export async function sendRenewalReminder(opts: {
  email: string;
  name?: string;
  memberNo: string;
  expiresOn: string;
  renewUrl?: string;
  orgName?: string;
}): Promise<{ id: string }> {
  const name = opts.name ?? 'Member';
  const org = opts.orgName ?? ORG_NAME;
  const html = `
    <p>Hi ${escapeHtml(name)},</p>
    <p>Your ${org} membership (No: ${escapeHtml(opts.memberNo)}) is expiring on <b>${escapeHtml(opts.expiresOn)}</b>.</p>
    ${opts.renewUrl ? `<p>Please renew here: <a href="${opts.renewUrl}">${opts.renewUrl}</a></p>` : ''}
    <p>Thank you,<br/>${org}</p>
    <hr/>
    <p style="font-size:12px;color:#6b7280;">${org} • ${escapeHtml(ORG_ADDRESS)} • <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a></p>
  `;

  return queueEmail({
    to: opts.email,
    subject: `${org} — Membership Renewal Reminder (${opts.memberNo})`,
    html,
    text: `Hi ${name},

Your ${org} membership (No: ${opts.memberNo}) expires on ${opts.expiresOn}.
${
  opts.renewUrl
    ? `Renew: ${opts.renewUrl}
`
    : ''
}
Thank you,
${org}`,
  });
}

export async function sendPaymentReceipt(opts: {
  email: string;
  name?: string;
  memberNo: string;
  amount: number;
  currency: string;
  method: string;
  reference?: string | null;
  orgName?: string;
}): Promise<{ id: string }> {
  const name = opts.name ?? 'Member';
  const org = opts.orgName ?? ORG_NAME;
  const amountFmt = `${opts.amount.toFixed(2)} ${opts.currency}`;
  const html = `
    <p>Hi ${escapeHtml(name)},</p>
    <p>Thank you for your payment.</p>
    <ul>
      <li><b>Member No:</b> ${escapeHtml(opts.memberNo)}</li>
      <li><b>Amount:</b> ${escapeHtml(amountFmt)}</li>
      <li><b>Method:</b> ${escapeHtml(opts.method)}</li>
      ${opts.reference ? `<li><b>Reference:</b> ${escapeHtml(opts.reference)}</li>` : ''}
    </ul>
    <p>Thank you,<br/>${org}</p>
    <hr/>
    <p style="font-size:12px;color:#6b7280;">${org} • ${escapeHtml(ORG_ADDRESS)} • <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a></p>
  `;

  return queueEmail({
    to: opts.email,
    subject: `${org} — Payment Receipt (${opts.memberNo})`,
    html,
    text: `Hi ${name},

Thank you for your payment.
Member No: ${opts.memberNo}
Amount: ${amountFmt}
Method: ${opts.method}
${
  opts.reference
    ? `Reference: ${opts.reference}
`
    : ''
}Thank you,
${org}`,
  });
}

export function membershipCardHtml(opts: {
  memberNo: string;
  name: string;
  region: string;
  validity: string;
  verifyUrl: string;
}) {
  const { memberNo, name, region, validity, verifyUrl } = opts;
  return `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Inter,Ubuntu,sans-serif;max-width:560px;margin:16px auto;">
  <h2 style="margin:0 0 12px;">Faleminderit – Mirësevini në Interdomestik</h2>
  <p style="margin:0 0 16px;">Kjo është karta juaj digjitale e anëtarit. Ruajeni këtë email ose vizitoni portalin për ta parë.</p>
  <div style="border:1px solid #e5e7eb;border-radius:16px;padding:16px;display:flex;gap:16px;align-items:center;">
    <div>
      <div style="font-size:14px;color:#6b7280;">Member No</div>
      <div style="font-weight:700;font-size:18px;letter-spacing:.5px;">${escapeHtml(memberNo)}</div>
      <div style="display:grid;grid-template-columns:120px 1fr;gap:4px;margin-top:8px;font-size:14px;">
        <div style="color:#6b7280;">Name</div><div>${escapeHtml(name)}</div>
        <div style="color:#6b7280;">Region</div><div>${escapeHtml(region)}</div>
        <div style="color:#6b7280;">Valid through</div><div>${escapeHtml(validity)}</div>
      </div>
    </div>
  </div>
  <div style="margin-top:12px;font-size:14px;">Verifikoni anëtarësimin: <a href="${verifyUrl}">${verifyUrl}</a></div>
  <div style="margin-top:12px;font-size:12px;color:#6b7280;">Share (text only): Interdomestik Member Card – ${escapeHtml(name)}, No: ${escapeHtml(memberNo)}, Valid until: ${escapeHtml(validity)}. Verify: ${verifyUrl}</div>
</div>`;
}

// --------------------------- utils ---------------------------
function escapeHtml(s: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return s.replace(/[&<>'"']/g, (c) => map[c] || c);
}
