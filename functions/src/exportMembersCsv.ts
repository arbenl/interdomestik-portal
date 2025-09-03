import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";

try {
  admin.app();
} catch {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Admin-only CSV export:
 * - One query: members (up to 10k)
 * - One query: active memberships (collectionGroup)
 * - Join in memory; no N+1 reads
 */
export const exportMembersCsv = functions
  .region("europe-west1")
  .https.onRequest(async (req: functions.https.Request, res: functions.Response): Promise<void> => {
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
        res.status(401).send("Missing Authorization");
        return;
      }
      const token = await admin.auth().verifyIdToken(authHeader);
      if ((token as any).role !== "admin") {
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
      const membersOrdered: Array<{ uid: string; data: any }> = [];
      const membersMap = new Map<string, any>();
      for (const doc of membersSnap.docs) {
        const m = doc.data();
        membersOrdered.push({ uid: doc.id, data: m });
        membersMap.set(doc.id, m);
      }

      // 2) Load all active memberships (single collectionGroup query)
      const now = admin.firestore.Timestamp.now();
      const activeSnap = await db
        .collectionGroup("memberships")
        .where("status", "==", "active")
        .where("expiresAt", ">", now)
        .get();

      // Build a set of active UIDs
      const activeUidSet = new Set<string>();
      for (const d of activeSnap.docs) {
        const uid = d.ref.parent.parent!.id; // /members/{uid}/memberships/{year}
        if (membersMap.has(uid)) activeUidSet.add(uid);
      }

      // 3) Emit CSV lines
      const lines = ["memberNo,name,email,phone,region,orgId,active"];
      const safe = (s: any) => (s == null ? "" : String(s).replace(/"/g, '""'));

      for (const { uid, data: m } of membersOrdered) {
        const active = activeUidSet.has(uid) ? "yes" : "no";
        lines.push(`"${safe(m.memberNo)}","${safe(m.name)}","${safe(m.email)}","${safe(m.phone)}","${safe(m.region)}","${safe(m.orgId)}","${active}"`);
      }

      // Return CSV
      const csv = lines.join("\n");
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="members.csv"'
      );
      res.status(200).send(csv);
      return;
    } catch (e) {
      res.status(500).send(String(e));
      return;
    }
  });
