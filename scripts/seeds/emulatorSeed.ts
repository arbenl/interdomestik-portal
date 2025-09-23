import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, doc, setDoc, connectFirestoreEmulator } from 'firebase/firestore';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const firestore = getFirestore(app);

connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
connectFirestoreEmulator(firestore, '127.0.0.1', 8080);

async function seed() {
  // Create admin, agent, and a base member
  const users = [
    { email: 'admin@example.com', password: 'S3cureP@ssw0rd!', role: 'admin' },
    { email: 'agent@example.com', password: 'S3cureP@ssw0rd!', role: 'agent' },
    { email: 'member@example.com', password: 'S3cureP@ssw0rd!', role: 'member' },
  ];

  // Create 27 additional members
  for (let i = 1; i <= 27; i++) {
    users.push({
      email: `member${i}@example.com`,
      password: 'S3cureP@ssw0rd!',
      role: 'member',
    });
  }

  for (const userData of users) {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, userData.email, userData.password);
      await setDoc(doc(firestore, 'members', userCredential.user.uid), { role: userData.role, email: userData.email });
      console.log(`Created user: ${userData.email}`);
    } catch (error) {
      console.error(`Failed to create user ${userData.email}:`, error);
    }
  }

  console.log('Emulator seeded successfully with 30 users.');
}

seed();
