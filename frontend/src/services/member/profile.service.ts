import { doc, getDoc, setDoc } from 'firebase/firestore';
import { firestore } from '../../firebase';
import type { Profile } from '@/types';

export async function getProfile(uid: string): Promise<Profile | null> {
  const docRef = doc(firestore, 'users', uid);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as Profile;
  }
  return null;
}

export async function updateProfile(uid: string, data: Partial<Profile>): Promise<void> {
  const docRef = doc(firestore, 'users', uid);
  await setDoc(docRef, data, { merge: true });
}
