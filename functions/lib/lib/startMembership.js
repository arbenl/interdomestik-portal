"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activateMembership = activateMembership;
exports.startMembershipLogic = startMembershipLogic;
const firebaseAdmin_1 = require("../firebaseAdmin");
const validators_1 = require("./validators");
const rbac_1 = require("./rbac");
const membership_1 = require("./membership");
async function activateMembership(uid, year, price, currency, paymentMethod, externalRef) {
    const startsAt = new Date(year, 0, 1);
    const expiresAt = new Date(year, 11, 31);
    const membershipData = {
        year,
        price,
        currency,
        paymentMethod,
        externalRef,
        status: 'active',
        startsAt,
        expiresAt,
        createdAt: firebaseAdmin_1.admin.firestore.FieldValue.serverTimestamp(),
    };
    const ref = await firebaseAdmin_1.db.collection('members').doc(uid).collection('memberships').add(membershipData);
    return { refPath: ref.path };
}
async function startMembershipLogic(data, context) {
    (0, rbac_1.requireAdmin)(context);
    const { uid, year, price, currency, paymentMethod, externalRef } = validators_1.startMembershipSchema.parse(data);
    const { refPath } = await activateMembership(uid, year, price, currency, paymentMethod, externalRef);
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
        validity: `${year + 1}`,
        verifyUrl,
    });
    await (0, membership_1.queueEmail)({ to: [email], subject: `Interdomestik Membership ${year}`, html });
    return { message: "Membership started successfully", refPath };
}
