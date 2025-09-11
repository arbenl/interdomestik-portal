import { initializeApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import { connectAuthEmulator, indexedDBLocalPersistence, initializeAuth, browserLocalPersistence } from "firebase/auth";
import { initializeFirestore, connectFirestoreEmulator, persistentLocalCache } from "firebase/firestore";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";

const cfgProjectId = import.meta.env.VITE_FB_PROJECT_ID || 'demo-interdomestik';
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FB_API_KEY || "dummy-api-key",
  authDomain: import.meta.env.VITE_FB_AUTH_DOMAIN || `${cfgProjectId}.firebaseapp.com`,
  projectId: cfgProjectId,
  storageBucket: import.meta.env.VITE_FB_STORAGE_BUCKET || `${cfgProjectId}.appspot.com`,
  messagingSenderId: import.meta.env.VITE_FB_MESSAGING_SENDER_ID || "1234567890",
  appId: import.meta.env.VITE_FB_APP_ID || "1:1234567890:web:abcdef1234567890",
  measurementId: import.meta.env.VITE_FB_MEASUREMENT_ID || "G-ABCDEFGHIJ",
};

const app = initializeApp(firebaseConfig);
const projectId = (app as any)?.options?.projectId || cfgProjectId;
const storageBucket = (app as any)?.options?.storageBucket || `${projectId}.appspot.com`;

// Prefer explicit auth initialization to ensure IndexedDB persistence
const auth = initializeAuth(app, {
  persistence: [indexedDBLocalPersistence, browserLocalPersistence]
});

// Enable persistent local cache to speed up reads and offline
const db = initializeFirestore(app, {
  // Use persistent local cache; keep simple to play nicely with test mocks
  localCache: persistentLocalCache(),
  // Force long polling to eliminate stream errors in some networks
  experimentalForceLongPolling: true,
});

// Match backend region
const functions = getFunctions(app, 'europe-west1');

// Emulator config from Vite env (optional) or defaults
const host = import.meta.env.VITE_EMULATOR_HOST ?? '127.0.0.1';
const fsPort = Number(import.meta.env.VITE_FIRESTORE_PORT ?? 8085);
const fnPort = Number(import.meta.env.VITE_FUNCTIONS_PORT ?? 5001);
const authPort = Number(import.meta.env.VITE_AUTH_PORT ?? 9099);

if (typeof location !== 'undefined' && (location.hostname === "localhost" || location.hostname === "127.0.0.1")) {
  // Only connect to emulators in local dev (quiet logging)
  connectAuthEmulator(auth, `http://${host}:${authPort}`);
  connectFirestoreEmulator(db, host, fsPort);
  connectFunctionsEmulator(functions, host, fnPort);
}

export { auth, db, functions, projectId, storageBucket };

// Optional: App Check (prod)
try {
  if (typeof window !== 'undefined') {
    const siteKey = import.meta.env.VITE_APPCHECK_SITE_KEY as string | undefined;
    if (siteKey && siteKey.trim()) {
      initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(siteKey),
        isTokenAutoRefreshEnabled: true,
      });
    }
  }
} catch {
  // ignore App Check init errors in non-browser/test environments
}
