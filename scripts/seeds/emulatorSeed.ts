import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'demo-api-key',
  authDomain: 'localhost',
  projectId: 'demo-interdomestik',
  storageBucket: 'demo-interdomestik.appspot.com',
  messagingSenderId: 'demo-messaging-sender-id',
  appId: 'demo-app-id',
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const firestore = getFirestore(app);

async function seed() {
  // Create users
  const admin = await createUserWithEmailAndPassword(auth, 'admin@example.com', 'password');
  const agent = await createUserWithEmailAndPassword(auth, 'agent@example.com', 'password');
  const member = await createUserWithEmailAndPassword(auth, 'member@example.com', 'password');

  // Set user roles
  await setDoc(doc(firestore, 'members', admin.user.uid), { role: 'admin' });
  await setDoc(doc(firestore, 'members', agent.user.uid), { role: 'agent' });
  await setDoc(doc(firestore, 'members', member.user.uid), { role: 'member' });

  console.log('Emulator seeded successfully');
}

seed();
