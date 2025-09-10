import { initializeApp } from "firebase/app";
import { connectAuthEmulator, indexedDBLocalPersistence, initializeAuth, browserLocalPersistence } from "firebase/auth";
import { initializeFirestore, connectFirestoreEmulator, persistentLocalCache } from "firebase/firestore";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";

const firebaseConfig = {
  apiKey: "dummy-api-key",
  authDomain: "demo-interdomestik.firebaseapp.com",
  projectId: "demo-interdomestik",
  storageBucket: "demo-interdomestik.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef1234567890",
  measurementId: "G-ABCDEFGHIJ",
};

const app = initializeApp(firebaseConfig);

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

export { auth, db, functions };
