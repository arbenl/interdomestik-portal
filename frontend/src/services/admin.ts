import { collection, getDocs, query, where, limit, orderBy, startAfter } from 'firebase/firestore';
import { firestore } from '../firebase';
import type { Profile } from '@/types';

export const getUsers = async ({ allowedRegions, region, status, expiringDays, pageParam, limitNum = 25 }: { allowedRegions: string[], region: string, status: string, expiringDays: number | null, pageParam: unknown, limitNum: number }): Promise<{ users: Profile[], nextPage: unknown }> => {
  let q = query(collection(firestore, 'members'), orderBy('createdAt', 'desc'));

  if (region !== 'ALL') {
    q = query(q, where('region', '==', region));
  } else if (allowedRegions.length > 0) {
    q = query(q, where('region', 'in', allowedRegions));
  }

  if (status !== 'ALL') {
    q = query(q, where('status', '==', status));
  }

  if (expiringDays) {
    const now = new Date();
    const expiringDate = new Date(now.setDate(now.getDate() + expiringDays));
    q = query(q, where('expiresAt', '<=', expiringDate));
  }

  if (pageParam) {
    q = query(q, startAfter(pageParam));
  }

  q = query(q, limit(limitNum + 1));

  const snapshot = await getDocs(q);
  const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Profile));

  const nextPage = users.length > limitNum ? snapshot.docs[limitNum] : null;
  if (nextPage) {
    users.pop();
  }

  return { users, nextPage };
};
