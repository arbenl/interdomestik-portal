"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reserveUniqueEmail = reserveUniqueEmail;
exports.reserveUniquePhone = reserveUniquePhone;
exports.nextMemberNo = nextMemberNo;
const firebaseAdmin_1 = require("../firebaseAdmin");
async function reserveUniqueEmail(uid, email_norm, tx) {
    const ref = firebaseAdmin_1.db.doc('unique/email/' + email_norm);
    const snap = await tx.get(ref);
    if (snap.exists && snap.get('uid') !== uid)
        throw new Error('EMAIL_IN_USE');
    tx.set(ref, { uid }, { merge: true });
}
async function reserveUniquePhone(uid, phone_e164, tx) {
    if (!phone_e164)
        return;
    const ref = firebaseAdmin_1.db.doc('unique/phone/' + phone_e164);
    const snap = await tx.get(ref);
    if (snap.exists && snap.get('uid') !== uid)
        throw new Error('PHONE_IN_USE');
    tx.set(ref, { uid }, { merge: true });
}
async function nextMemberNo(tx) {
    const y = 2025;
    const counterRef = firebaseAdmin_1.db.doc(`counters/members-${y}`);
    const c = await tx.get(counterRef);
    const next = ((c.exists && c.get('current')) || 0) + 1;
    tx.set(counterRef, { current: next }, { merge: true });
    const seq = String(next).padStart(6, '0');
    return `INT-${y}-${seq}`;
}
