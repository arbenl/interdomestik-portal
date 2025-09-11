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
exports.exportMembersCsv = void 0;
const functions = __importStar(require("firebase-functions/v1"));
const admin = __importStar(require("firebase-admin"));
const firestore_1 = require("firebase-admin/firestore");
const logger_1 = require("./lib/logger");
try {
    admin.app();
}
catch {
    admin.initializeApp();
}
const db = admin.firestore();
/**
 * Admin-only CSV export:
 * - One query: members (up to 10k)
 * - One query: active memberships (collectionGroup)
 * - Join in memory; no N+1 reads
 */
exports.exportMembersCsv = functions
    .runWith({ memory: '256MB', timeoutSeconds: 60 })
    .region("europe-west1")
    .https.onRequest(async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
    if (req.method === "OPTIONS") {
        res.status(200).send("ok");
        return;
    }
    try {
        // AuthZ: admin only
        const authHeader = (req.headers.authorization || "")
            .replace("Bearer ", "")
            .trim();
        if (!authHeader) {
            (0, logger_1.log)('export_csv_unauthorized', {});
            res.status(401).send("Missing Authorization");
            return;
        }
        const token = await admin.auth().verifyIdToken(authHeader);
        if (token.role !== "admin") {
            (0, logger_1.log)('export_csv_forbidden', { uid: token.uid });
            res.status(403).send("Admins only");
            return;
        }
        // 1) Load members (single query)
        const membersSnap = await db
            .collection("members")
            .orderBy("memberNo")
            .limit(10000)
            .get();
        // Build an ordered list + uid→data map for stable CSV order
        const membersOrdered = [];
        const membersMap = new Map();
        for (const doc of membersSnap.docs) {
            const m = doc.data();
            membersOrdered.push({ uid: doc.id, data: m });
            membersMap.set(doc.id, m);
        }
        // 2) Load all active memberships (single collectionGroup query)
        const now = firestore_1.Timestamp.now();
        const activeSnap = await db
            .collectionGroup("memberships")
            .where("status", "==", "active")
            .where("expiresAt", ">", now)
            .get();
        // Build a set of active UIDs
        const activeUidSet = new Set();
        for (const d of activeSnap.docs) {
            const uid = d.ref.parent.parent.id; // /members/{uid}/memberships/{year}
            if (membersMap.has(uid))
                activeUidSet.add(uid);
        }
        // 3) Emit CSV lines
        const lines = ["memberNo,name,email,phone,region,orgId,active"];
        const safe = (s) => (s == null ? "" : String(s).replace(/"/g, '""'));
        for (const { uid, data: m } of membersOrdered) {
            const active = activeUidSet.has(uid) ? "yes" : "no";
            lines.push(`"${safe(m.memberNo)}","${safe(m.name)}","${safe(m.email)}","${safe(m.phone)}","${safe(m.region)}","${safe(m.orgId)}","${active}"`);
        }
        // Return CSV
        const csv = lines.join("\n");
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", 'attachment; filename="members.csv"');
        (0, logger_1.log)('export_csv_success', { count: membersOrdered.length });
        res.status(200).send(csv);
        return;
    }
    catch (e) {
        (0, logger_1.log)('export_csv_error', { error: String(e) });
        res.status(500).send(String(e));
        return;
    }
});
