import { initializeApp, getApps } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

const DEFAULT_DEV_PROJECT_ID = 'interdomestik-dev';
const usingEmulators = import.meta.env.VITE_USE_EMULATORS === 'true';
const configuredProjectId = (import.meta.env.VITE_FIREBASE_PROJECT_ID ?? '').trim() || undefined;
const configuredEmuProjectId = (import.meta.env.VITE_FIREBASE_EMULATOR_PROJECT_ID ?? '').trim() || undefined;

export const emulatorProjectId = configuredEmuProjectId || DEFAULT_DEV_PROJECT_ID;

if (usingEmulators && configuredProjectId && configuredProjectId !== emulatorProjectId) {
  console.warn(`[firebase] Using emulators with project id "${configuredProjectId}". Set VITE_FIREBASE_PROJECT_ID=${emulatorProjectId} (or adjust VITE_FIREBASE_EMULATOR_PROJECT_ID) so auth tokens and callable URLs stay consistent.`);
}

const projectId = usingEmulators
  ? emulatorProjectId
  : configuredProjectId || DEFAULT_DEV_PROJECT_ID;

export { projectId, usingEmulators };

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
  // add VITE_FIREBASE_* you actually use (e.g., storageBucket)
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const firestore = getFirestore(app);
// All Cloud Functions are deployed to europe-west1
export const functions = getFunctions(app, 'europe-west1');

if (usingEmulators) {
  console.log(`Connecting to Firebase emulators (project: ${emulatorProjectId})...`);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(firestore, '127.0.0.1', 8080);
  connectFunctionsEmulator(functions, '127.0.0.1', 5001);
}

if (!firebaseConfig.projectId || !firebaseConfig.apiKey) {
  // Helpful hint in dev environments if env vars are missing
  // Avoid throwing to keep tests/environments flexible
  console.warn('[firebase] Missing VITE_FIREBASE_* env vars. Check frontend/.env.example');
}
