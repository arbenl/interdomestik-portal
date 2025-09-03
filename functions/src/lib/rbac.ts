import * as functions from "firebase-functions/v1";

export function requireAuth(ctx: functions.https.CallableContext) {
  if (!ctx.auth) throw new functions.https.HttpsError("unauthenticated", "Sign in required");
  return ctx.auth;
}

export function requireAdmin(ctx: functions.https.CallableContext) {
  const a = requireAuth(ctx);
  if ((a.token as any).role !== "admin") throw new functions.https.HttpsError("permission-denied", "Admin only");
  return a;
}