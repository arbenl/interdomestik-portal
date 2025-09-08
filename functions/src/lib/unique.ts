import { admin, db } from "../firebaseAdmin";

// Registry collections (cheap uniqueness registry):
//  - registry_email/{emailLower}  -> { uid }
//  - registry_memberNo/{memberNo} -> { uid }

export async function reserveUniqueEmail(
  uid: string,
  emailLower: string,
  tx: admin.firestore.Transaction
) {
  const ref = db.collection('registry_email').doc(emailLower);
  const snap = await tx.get(ref);
  if (snap.exists && snap.get('uid') !== uid) throw new Error('EMAIL_IN_USE');
  tx.set(ref, { uid }, { merge: true });
}

export async function reserveUniqueMemberNo(
  uid: string,
  memberNo: string,
  tx: admin.firestore.Transaction
) {
  const ref = db.collection('registry_memberNo').doc(memberNo);
  const snap = await tx.get(ref);
  if (snap.exists && snap.get('uid') !== uid) throw new Error('MEMBERNO_IN_USE');
  tx.set(ref, { uid }, { merge: true });
}

export async function nextMemberNo(tx: admin.firestore.Transaction) {
  const y = 2025; // consider deriving from current year if business allows
  const counterRef = db.doc(`counters/members-${y}`);
  const c = await tx.get(counterRef);
  const next = ((c.exists && c.get('current')) || 0) + 1;
  tx.set(counterRef, { current: next }, { merge: true });
  const seq = String(next).padStart(6, '0');
  return `INT-${y}-${seq}`;
}
