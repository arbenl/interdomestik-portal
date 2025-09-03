"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.upsertProfileLogic = upsertProfileLogic;
const validators_1 = require("./validators");
const rbac_1 = require("./rbac");
const unique_1 = require("./unique");
const firebaseAdmin_1 = require("../firebaseAdmin");
async function upsertProfileLogic(data, context) {
    const auth = (0, rbac_1.requireAuth)(context);
    const validatedData = validators_1.upsertProfileSchema.parse(data);
    const memberRef = firebaseAdmin_1.db.collection('members').doc(auth.uid);
    await firebaseAdmin_1.db.runTransaction(async (tx) => {
        const memberDoc = await tx.get(memberRef);
        let memberNo = memberDoc.get('memberNo');
        if (!memberDoc.exists) {
            memberNo = await (0, unique_1.nextMemberNo)(tx);
        }
        tx.set(memberRef, { ...validatedData, memberNo }, { merge: true });
    });
    return { message: "Profile updated successfully" };
}
