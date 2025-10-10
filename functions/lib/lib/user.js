"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.setUserRoleLogic = setUserRoleLogic;
exports.searchUserByEmailLogic = searchUserByEmailLogic;
exports.getUserClaimsLogic = getUserClaimsLogic;
const firebaseAdmin_1 = require("../firebaseAdmin");
const firestore_1 = require("firebase-admin/firestore");
const functions = __importStar(require("firebase-functions/v1"));
const validators_1 = require("./validators");
const logger_1 = require("./logger");
const rbac_1 = require("./rbac");
async function setUserRoleLogic(data, context) {
    (0, rbac_1.requireAdmin)(context);
    const { uid, role, allowedRegions } = validators_1.setUserRoleSchema.parse(data);
    const userRecord = await firebaseAdmin_1.admin.auth().getUser(uid);
    const existingClaims = userRecord.customClaims ?? {};
    await firebaseAdmin_1.admin
        .auth()
        .setCustomUserClaims(uid, { ...existingClaims, role, allowedRegions });
    await firebaseAdmin_1.db
        .collection('members')
        .doc(uid)
        .set({ role, allowedRegions }, { merge: true });
    // Audit log
    try {
        await firebaseAdmin_1.db.collection('audit_logs').add({
            action: 'setUserRole',
            actor: context.auth?.uid || 'system',
            target: uid,
            role,
            allowedRegions: allowedRegions ?? [],
            ts: firestore_1.FieldValue.serverTimestamp(),
            ttlAt: firestore_1.Timestamp.fromDate(new Date(Date.now() + 180 * 24 * 60 * 60 * 1000)),
        });
    }
    catch (e) {
        (0, logger_1.log)('audit_write_failed', { action: 'setUserRole', uid, error: String(e) });
    }
    return { message: 'User role updated successfully' };
}
async function searchUserByEmailLogic(data, context) {
    (0, rbac_1.requireAdmin)(context);
    const { email } = data;
    try {
        const userRecord = await firebaseAdmin_1.admin.auth().getUserByEmail(email);
        return { uid: userRecord.uid };
    }
    catch (error) {
        throw new functions.https.HttpsError('not-found', 'User not found');
    }
}
async function getUserClaimsLogic(data, context) {
    (0, rbac_1.requireAdmin)(context);
    const uid = String(data?.uid || '').trim();
    if (!uid)
        throw new functions.https.HttpsError('invalid-argument', 'uid required');
    const user = await firebaseAdmin_1.admin.auth().getUser(uid);
    const claims = (user.customClaims || {});
    return { uid, claims };
}
