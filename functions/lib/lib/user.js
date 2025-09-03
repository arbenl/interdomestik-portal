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
const firebaseAdmin_1 = require("../firebaseAdmin");
const functions = __importStar(require("firebase-functions/v1"));
const validators_1 = require("./validators");
const rbac_1 = require("./rbac");
async function setUserRoleLogic(data, context) {
    (0, rbac_1.requireAdmin)(context);
    const { uid, role, allowedRegions } = validators_1.setUserRoleSchema.parse(data);
    await firebaseAdmin_1.admin.auth().setCustomUserClaims(uid, { role, allowedRegions });
    await firebaseAdmin_1.db.collection('members').doc(uid).set({ role, allowedRegions }, { merge: true });
    return { message: "User role updated successfully" };
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
