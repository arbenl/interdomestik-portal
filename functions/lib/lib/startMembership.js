"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activateMembership = activateMembership;
exports.startMembershipLogic = startMembershipLogic;
const firebaseAdmin_1 = require("../firebaseAdmin");
const firestore_1 = require("firebase-admin/firestore");
const validators_1 = require("./validators");
const rbac_1 = require("./rbac");
const membership_1 = require("./membership");
async function activateMembership(uid, year, price, currency, paymentMethod, externalRef) {
    const startsAt = firebaseAdmin_1.admin.firestore.Timestamp.fromDate(new Date(year, 0, 1));
    const expiresAt = firebaseAdmin_1.admin.firestore.Timestamp.fromDate(new Date(year, 11, 31, 23, 59, 59));
    const ref = firebaseAdmin_1.db.collection('members').doc(uid).collection('memberships').doc(String(year));
    let alreadyActive = false;
    await firebaseAdmin_1.db.runTransaction(async (tx) => {
        const existing = await tx.get(ref);
        if (existing.exists && existing.get('status') === 'active') {
            alreadyActive = true;
        }
        tx.set(ref, {
            year,
            price,
            currency,
            paymentMethod,
            externalRef: externalRef ?? null,
            status: 'active',
            startedAt: startsAt,
            expiresAt,
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        }, { merge: true });
        const memberRef = firebaseAdmin_1.db.collection('members').doc(uid);
        tx.set(memberRef, {
            status: 'active',
            year,
            expiresAt,
            activeMembership: {
                year,
                status: 'active',
                expiresAt,
            },
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        }, { merge: true });
    });
    return { refPath: ref.path, alreadyActive };
}
async function startMembershipLogic(data, context) {
    (0, rbac_1.requireAdmin)(context);
    const { uid, year, price, currency, paymentMethod, externalRef } = validators_1.startMembershipSchema.parse(data);
    const { refPath, alreadyActive } = await activateMembership(uid, year, price, currency, paymentMethod, externalRef);
    const memberDoc = await firebaseAdmin_1.db.collection('members').doc(uid).get();
    const memberNo = memberDoc.get('memberNo');
    const name = memberDoc.get('name');
    const region = memberDoc.get('region');
    const email = memberDoc.get('email');
    const verifyUrl = `https://interdomestik.app/verify?memberNo=${memberNo}`;
    const html = (0, membership_1.membershipCardHtml)({
        memberNo,
        name,
        region,
        validity: `${year}`,
        verifyUrl,
    });
    if (!alreadyActive) {
        await (0, membership_1.queueEmail)({ to: [email], subject: `Interdomestik Membership ${year}`, html });
    }
    // Send payment receipt if any payment recorded
    if (!alreadyActive && (price ?? 0) > 0) {
        await (0, membership_1.sendPaymentReceipt)({
            email,
            name,
            memberNo,
            amount: price ?? 0,
            currency,
            method: paymentMethod,
            reference: externalRef ?? undefined,
        });
    }
    // Audit log
    try {
        await firebaseAdmin_1.db.collection('audit_logs').add({
            action: 'startMembership',
            actor: context.auth?.uid || 'system',
            target: uid,
            year,
            amount: price ?? 0,
            currency,
            method: paymentMethod,
            ts: firestore_1.FieldValue.serverTimestamp(),
        });
    }
    catch (e) {
        console.warn('[audit] failed to write startMembership audit', e);
    }
    // Metrics: increment daily activations and by-region counts (best effort)
    try {
        const dateKey = new Date().toISOString().slice(0, 10); // YYYY-MM-DD (local UTC ok for coarse metrics)
        const ref = firebaseAdmin_1.db.collection('metrics').doc(`daily-${dateKey}`);
        const inc = firebaseAdmin_1.admin.firestore.FieldValue.increment?.(1) || firestore_1.FieldValue.increment(1);
        await ref.set({
            activations_total: inc,
            [`activations_by_region.${region || 'UNKNOWN'}`]: inc,
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        }, { merge: true });
    }
    catch (e) {
        console.warn('[metrics] failed to write activation metric', e);
    }
    return { message: "Membership started successfully", refPath };
}
