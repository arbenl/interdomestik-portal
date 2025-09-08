"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reserveUniqueEmail = reserveUniqueEmail;
exports.reserveUniqueMemberNo = reserveUniqueMemberNo;
exports.nextMemberNo = nextMemberNo;
const firebaseAdmin_1 = require("../firebaseAdmin");
// Registry collections (cheap uniqueness registry):
//  - registry_email/{emailLower}  -> { uid }
//  - registry_memberNo/{memberNo} -> { uid }
async function reserveUniqueEmail(uid, emailLower, tx) {
    const ref = firebaseAdmin_1.db.collection('registry_email').doc(emailLower);
    const snap = await tx.get(ref);
    if (snap.exists && snap.get('uid') !== uid)
        throw new Error('EMAIL_IN_USE');
    tx.set(ref, { uid }, { merge: true });
}
async function reserveUniqueMemberNo(uid, memberNo, tx) {
    const ref = firebaseAdmin_1.db.collection('registry_memberNo').doc(memberNo);
    const snap = await tx.get(ref);
    if (snap.exists && snap.get('uid') !== uid)
        throw new Error('MEMBERNO_IN_USE');
    tx.set(ref, { uid }, { merge: true });
}
async function nextMemberNo(tx) {
    const y = 2025; // consider deriving from current year if business allows
    const counterRef = firebaseAdmin_1.db.doc(`counters/members-${y}`);
    const c = await tx.get(counterRef);
    const next = ((c.exists && c.get('current')) || 0) + 1;
    tx.set(counterRef, { current: next }, { merge: true });
    const seq = String(next).padStart(6, '0');
    return `INT-${y}-${seq}`;
}
