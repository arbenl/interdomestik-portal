import { doc, getDoc, getDocs, collection } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { firestore, functions } from '@/lib/firebase';
import type { Profile, Membership, Invoice } from '@/types';

export const getMemberProfile = async (
  uid: string
): Promise<Profile | null> => {
  const docRef = doc(firestore, 'members', uid);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return docSnap.data() as Profile;
  }
  return null;
};

export const getMembershipHistory = async (
  uid: string
): Promise<Membership[]> => {
  const historyCollection = collection(
    firestore,
    'members',
    uid,
    'memberships'
  );
  const snapshot = await getDocs(historyCollection);
  return snapshot.docs.map((doc) => doc.data() as Membership);
};

export const getInvoices = async (uid: string): Promise<Invoice[]> => {
  const invoicesCollection = collection(firestore, 'billing', uid, 'invoices');
  const snapshot = await getDocs(invoicesCollection);
  return snapshot.docs.map((doc) => doc.data() as Invoice);
};

export const getCardToken = async (uid: string): Promise<string> => {
  const getCardToken = httpsCallable<{ uid: string }, { token: string }>(
    functions,
    'getCardToken'
  );
  const result = await getCardToken({ uid });
  return result.data.token;
};
