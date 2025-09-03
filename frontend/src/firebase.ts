import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
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

const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app);

if (location.hostname === "localhost" || location.hostname === "127.0.0.1") {
  console.log("Using local emulators");
  connectAuthEmulator(auth, "http://localhost:9099");
  connectFirestoreEmulator(db, "localhost", 8080);
  connectFunctionsEmulator(functions, "localhost", 5001);
}

export { auth, db, functions };
