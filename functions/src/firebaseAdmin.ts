import * as admin from 'firebase-admin';

admin.initializeApp();

const db = admin.firestore();
// Ignore undefined fields in writes to simplify optional value handling
try {
  // Supported by @google-cloud/firestore settings
  // Safe no-op if not supported in a future version
  (db as any).settings?.({ ignoreUndefinedProperties: true });
} catch {}

export { admin, db };
