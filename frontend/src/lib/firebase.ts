import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

const app = initializeApp({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
});

export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app, 'europe-west1');
export const firestore = db;
export const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
export const emulatorProjectId = 'demo-interdomestik';

const useEmulators = ['1', 'true', 'TRUE'].includes(
  String(import.meta.env.VITE_USE_EMULATORS ?? '').trim()
);

if (useEmulators) {
  connectAuthEmulator(
    auth,
    `http://localhost:${import.meta.env.VITE_EMU_AUTH_PORT ?? 9099}`,
    { disableWarnings: true }
  );
  connectFirestoreEmulator(
    db,
    'localhost',
    Number(import.meta.env.VITE_EMU_FS_PORT ?? 8080)
  );
  connectFunctionsEmulator(
    functions,
    'localhost',
    Number(import.meta.env.VITE_EMU_FN_PORT ?? 5001)
  );
  // Optional: prove in E2E that we are connected
  interface CustomWindow extends Window {
    __emu?: boolean;
  }
  (window as CustomWindow).__emu = true;
}
