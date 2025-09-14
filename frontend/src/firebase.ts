import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import { config } from "./config/env";

const app = initializeApp(config.firebase);
const auth = getAuth(app);
const firestore = getFirestore(app);
const functions = getFunctions(app, 'europe-west1');
const projectId = app.options?.projectId;
const storageBucket = app.options?.storageBucket;

// Connect to emulators if VITE_USE_EMULATORS is true
if (config.useEmulators) {
  console.log('Connecting to Firebase emulators...');
  Promise.all([
    import('firebase/auth'),
    import('firebase/firestore'),
    import('firebase/functions'),
  ]).then(([authModule, firestoreModule, functionsModule]) => {
    const { host: authHost, port: authPort } = config.emulators.auth;
    const { host: firestoreHost, port: firestorePort } = config.emulators.firestore;
    const { host: functionsHost, port: functionsPort } = config.emulators.functions;

    authModule.connectAuthEmulator(auth, `http://${authHost}:${authPort}`, { disableWarnings: true });
    firestoreModule.connectFirestoreEmulator(firestore, firestoreHost, firestorePort);
    functionsModule.connectFunctionsEmulator(functions, functionsHost, functionsPort);
  }).catch(e => {
    console.error("Failed to load emulator modules", e);
  });
}

export { app, auth, firestore, functions, projectId, storageBucket };
