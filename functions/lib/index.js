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
exports.verifyMembership = exports.clearDatabase = exports.searchUserByEmail = exports.startMembership = exports.setUserRole = exports.upsertProfile = void 0;
const functions = __importStar(require("firebase-functions/v1"));
const firebaseAdmin_1 = require("./firebaseAdmin");
const upsertProfile_1 = require("./lib/upsertProfile");
const user_1 = require("./lib/user");
const startMembership_1 = require("./lib/startMembership");
exports.upsertProfile = functions.https.onCall((data, context) => {
    return (0, upsertProfile_1.upsertProfileLogic)(data, context);
});
exports.setUserRole = functions.https.onCall((data, context) => {
    return (0, user_1.setUserRoleLogic)(data, context);
});
exports.startMembership = functions.https.onCall((data, context) => {
    return (0, startMembership_1.startMembershipLogic)(data, context);
});
exports.searchUserByEmail = functions.https.onCall((data, context) => {
    return (0, user_1.searchUserByEmailLogic)(data, context);
});
exports.clearDatabase = functions.region("europe-west1").https.onRequest(async (req, res) => {
    try {
        const firestore = firebaseAdmin_1.db;
        const auth = firebaseAdmin_1.admin.auth();
        // Delete all users
        const listUsersResult = await auth.listUsers();
        await Promise.all(listUsersResult.users.map(user => auth.deleteUser(user.uid)));
        // Delete all member documents
        const membersSnapshot = await firestore.collection('members').get();
        await Promise.all(membersSnapshot.docs.map(doc => doc.ref.delete()));
        res.status(200).send('Database cleared successfully.');
    }
    catch (error) {
        console.error('Error clearing database:', error);
        if (error instanceof Error) {
            res.status(500).send(`Error clearing database: ${error.message}`);
        }
        else {
            res.status(500).send('An unknown error occurred during database clearing.');
        }
    }
});
exports.verifyMembership = functions
    .region("europe-west1")
    .https.onRequest(async (req, res) => {
    // Basic CORS for GET
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") {
        res.status(200).send("ok");
        return;
    }
    if (req.method !== "GET") {
        res.status(405).json({ ok: false, error: "Method not allowed" });
        return;
    }
    try {
        const memberNoRaw = req.query.memberNo;
        const memberNo = String(memberNoRaw ?? "").trim();
        if (!memberNo) {
            res.status(400).json({ ok: false, error: "memberNo required" });
            return;
        }
        // Optional: quick format sanity check to avoid useless reads
        // (Adjust to your exact pattern if needed)
        if (!/^INT-\d{4}-\d{6}$/.test(memberNo)) {
            res.json({ ok: true, valid: false, memberNo });
            return;
        }
        // Find the member by memberNo
        const q = await firebaseAdmin_1.db
            .collection("members")
            .where("memberNo", "==", memberNo)
            .limit(1)
            .get();
        if (q.empty) {
            res.json({ ok: true, valid: false, memberNo });
            return;
        }
        const doc = q.docs[0];
        // Check any active (unexpired) membership
        const activeSnap = await firebaseAdmin_1.db
            .collection("members")
            .doc(doc.id)
            .collection("memberships")
            .where("status", "==", "active")
            .where("expiresAt", ">", firebaseAdmin_1.admin.firestore.Timestamp.now())
            .limit(1)
            .get();
        res.json({
            ok: true,
            valid: !activeSnap.empty,
            memberNo,
            name: doc.get("name") || "Member",
            region: doc.get("region") || "—",
        });
        return;
    }
    catch (e) {
        res.status(500).json({ ok: false, error: String(e) });
        return;
    }
});
// export const seedDatabase = functions.region("europe-west1").https.onRequest(async (req: functions.https.Request, res: functions.Response): Promise<void> => {
//   try {
//     // Clear existing data (optional, but good for test isolation)
//     // This is a simplified clear and might need more robust implementation for production
//     const firestore = admin.firestore();
//     const auth = admin.auth();
//     // Seed a regular user
//     const regularUser = await auth.createUser({
//       email: 'testuser@example.com',
//       password: 'password123',
//       displayName: 'Test User',
//     });
//     await firestore.collection('members').doc(regularUser.uid).set({
//       name: 'Test User',
//       email: 'testuser@example.com',
//       memberNo: 'INT-2023-000001',
//       region: 'Europe',
//       role: 'member',
//     });
//     await firestore.collection('members').doc(regularUser.uid).collection('memberships').add({
//       year: 2025,
//       status: 'active',
//       startsAt: admin.firestore.Timestamp.fromDate(new Date('2025-01-01')),
//       expiresAt: admin.firestore.Timestamp.fromDate(new Date('2025-12-31')),
//       price: 100,
//       currency: 'EUR',
//       paymentMethod: 'Stripe',
//       externalRef: 'stripe_123',
//     });
//     // Seed an admin user
//     const adminUser = await auth.createUser({
//       email: 'admin@example.com',
//       password: 'password123',
//       displayName: 'Admin User',
//     });
//     await auth.setCustomUserClaims(adminUser.uid, { role: 'admin', allowedRegions: ['Europe', 'Asia'] });
//     await firestore.collection('members').doc(adminUser.uid).set({
//       name: 'Admin User',
//       email: 'admin@example.com',
//       memberNo: 'INT-2023-000002',
//       region: 'Europe',
//       role: 'admin',
//     });
//     res.status(200).send('Database seeded successfully.');
//   } catch (error: unknown) {
//     console.error('Error seeding database:', error);
//     if (error instanceof Error) {
//       res.status(500).send(`Error seeding database: ${error.message}`);
//     } else {
//       res.status(500).send('An unknown error occurred during database seeding.');
//     }
//   }
// });
// export const upsertProfile = functions.https.onCall((data, context) => {
//   return upsertProfileLogic(admin, data, context);
// });
// export const setUserRole = functions.https.onCall((data, context) => {
//   return setUserRoleLogic(admin, data, context);
// });
// export async function setUserRoleLogic(adminInstance: typeof admin, data: any, context: functions.https.CallableContext) {
//   requireAdmin(context);
//   const { uid, role, allowedRegions } = setUserRoleSchema.parse(data);
//   await adminInstance.auth().setCustomUserClaims(uid, { role, allowedRegions });
//   await adminInstance.firestore().collection('members').doc(uid).set({ role, allowedRegions }, { merge: true });
//   return { message: "User role updated successfully" };
// }
// export const startMembership = functions.https.onCall((data, context) => {
//   return startMembershipLogic(admin, data, context);
// });
// export async function startMembershipLogic(adminInstance: typeof admin, data: any, context: functions.https.CallableContext) {
//   requireAdmin(context);
//   const { uid, year, price, currency, paymentMethod, externalRef } = startMembershipSchema.parse(data);
//   const { refPath } = await activateMembership(uid, year, price, currency, paymentMethod, externalRef);
//   const memberDoc = await adminInstance.firestore().collection('members').doc(uid).get();
//   const memberNo = memberDoc.get('memberNo');
//   const name = memberDoc.get('name');
//   const region = memberDoc.get('region');
//   const verifyUrl = `https://interdomestik.app/verify?memberNo=${memberNo}`;
//   const html = membershipCardHtml({
//     memberNo,
//     name,
//     region,
//     validity: `${year + 1}`,
//     verifyUrl,
//   });
//   await queueEmail([memberDoc.get('email')], `Interdomestik Membership ${year}`, html);
//   return { message: "Membership started successfully", refPath };
// }
// /**
//  * Public verification endpoint
//  * GET /verifyMembership?memberNo=INT-YYYY-XXXXXX
//  * - CORS: open to all (read-only check)
//  * - Does NOT return a Response object (Promise<void> compliant)
//  */
// export const verifyMembership = functions
//   .region("europe-west1")
//   .https.onRequest(async (req: functions.https.Request, res: functions.Response): Promise<void> => {
//     // Basic CORS for GET
//     res.set("Access-Control-Allow-Origin", "*");
//     res.set("Access-Control-Allow-Methods", "GET, OPTIONS");
//     res.set("Access-Control-Allow-Headers", "Content-Type");
//     if (req.method === "OPTIONS") {
//       res.status(200).send("ok");
//       return;
//     }
//     if (req.method !== "GET") {
//       res.status(405).json({ ok: false, error: "Method not allowed" });
//       return;
//     }
//     try {
//       const memberNoRaw = req.query.memberNo;
//       const memberNo = String(memberNoRaw ?? "").trim();
//       if (!memberNo) {
//         res.status(400).json({ ok: false, error: "memberNo required" });
//         return;
//       }
//       // Optional: quick format sanity check to avoid useless reads
//       // (Adjust to your exact pattern if needed)
//       if (!/^INT-\d{4}-\d{6}$/.test(memberNo)) {
//         res.json({ ok: true, valid: false, memberNo });
//         return;
//       }
//       // Find the member by memberNo
//       const q = await admin.firestore()
//         .collection("members")
//         .where("memberNo", "==", memberNo)
//         .limit(1)
//         .get();
//       if (q.empty) {
//         res.json({ ok: true, valid: false, memberNo });
//         return;
//       }
//       const doc = q.docs[0];
//       // Check any active (unexpired) membership
//       const activeSnap = await admin.firestore()
//         .collection("members")
//         .doc(doc.id)
//         .collection("memberships")
//         .where("status", "==", "active")
//         .where("expiresAt", ">", admin.firestore.Timestamp.now())
//         .limit(1)
//         .get();
//       res.json({
//         ok: true,
//         valid: !activeSnap.empty,
//         memberNo,
//         name: (doc.get("name") as string) || "Member",
//         region: (doc.get("region") as string) || "—",
//       });
//       return;
//     } catch (e) {
//       res.status(500).json({ ok: false, error: String(e) });
//       return;
//     }
//   });
