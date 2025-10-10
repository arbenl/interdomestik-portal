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
exports.upsertProfileLogic = upsertProfileLogic;
const functions = __importStar(require("firebase-functions/v1"));
const validators_1 = require("./validators");
const rbac_1 = require("./rbac");
const unique_1 = require("./unique");
const firebaseAdmin_1 = require("../firebaseAdmin");
const firestore_1 = require("firebase-admin/firestore");
const logger_1 = require("./logger");
async function upsertProfileLogic(data, context) {
    try {
        const auth = (0, rbac_1.requireAuth)(context);
        const validatedData = validators_1.upsertProfileSchema.parse(data);
        if (process.env.FUNCTIONS_EMULATOR) {
            (0, logger_1.log)('upsert_profile_start', { uid: auth.uid });
        }
        // Resolve email once outside the transaction
        let emailLower = auth.token.email?.toLowerCase();
        if (!emailLower) {
            const userRecord = await firebaseAdmin_1.admin.auth().getUser(auth.uid);
            if (!userRecord.email) {
                throw new functions.https.HttpsError('failed-precondition', 'Email missing on account');
            }
            emailLower = userRecord.email.toLowerCase();
        }
        const memberRef = firebaseAdmin_1.db.collection('members').doc(auth.uid);
        await firebaseAdmin_1.db.runTransaction(async (tx) => {
            const memberDoc = await tx.get(memberRef);
            if (process.env.FUNCTIONS_EMULATOR) {
                (0, logger_1.log)('upsert_profile_member_exists', {
                    uid: auth.uid,
                    exists: memberDoc.exists,
                });
            }
            let memberNo = memberDoc.get('memberNo');
            const nowTs = firestore_1.FieldValue.serverTimestamp();
            if (!memberDoc.exists) {
                memberNo = await (0, unique_1.nextMemberNo)(tx);
                await (0, unique_1.reserveUniqueMemberNo)(auth.uid, memberNo, tx);
                tx.set(memberRef, {
                    createdAt: nowTs,
                    status: 'none',
                    year: null,
                    expiresAt: null,
                }, { merge: true });
            }
            if (process.env.FUNCTIONS_EMULATOR) {
                (0, logger_1.log)('upsert_profile_reserve_email', { uid: auth.uid, emailLower });
            }
            await (0, unique_1.reserveUniqueEmail)(auth.uid, emailLower, tx);
            tx.set(memberRef, {
                ...validatedData,
                nameLower: String(validatedData.name || '')
                    .toLowerCase()
                    .trim(),
                email: emailLower,
                memberNo,
                updatedAt: nowTs,
            }, { merge: true });
        });
        // Keep Firebase Auth displayName in sync with profile name
        try {
            await firebaseAdmin_1.admin
                .auth()
                .updateUser(auth.uid, { displayName: validatedData.name });
        }
        catch (e) {
            // Non-fatal: log and continue
            (0, logger_1.log)('upsert_profile_auth_displayname_error', {
                uid: auth.uid,
                error: String(e),
            });
        }
        if (process.env.FUNCTIONS_EMULATOR) {
            (0, logger_1.log)('upsert_profile_success', { uid: auth.uid });
        }
        return { message: 'Profile updated successfully' };
    }
    catch (err) {
        const msg = String(err?.message || err);
        if (msg.includes('EMAIL_IN_USE')) {
            throw new functions.https.HttpsError('already-exists', 'Email is already registered');
        }
        if (msg.includes('MEMBERNO_IN_USE')) {
            throw new functions.https.HttpsError('aborted', 'Member number conflict, retry');
        }
        // Validation errors from zod
        if (err?.issues) {
            throw new functions.https.HttpsError('invalid-argument', 'Invalid profile data');
        }
        (0, logger_1.log)('upsert_profile_error', {
            uid: context?.auth?.uid,
            error: String(err?.stack || err),
        });
        throw new functions.https.HttpsError('internal', 'Profile update failed', msg);
    }
}
