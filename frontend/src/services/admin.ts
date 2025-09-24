import { collection, getDocs, query, where, limit, orderBy, startAfter, type QueryConstraint } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import type { Profile } from '@/types';

export const getUsers = async ({ allowedRegions = [], region, status, expiringDays, pageParam, limitNum = 25 }: { allowedRegions?: string[], region: string, status: string, expiringDays: number | null, pageParam: unknown, limitNum: number }): Promise<{ users: Profile[], nextPage: unknown }> => {
  const constraints: QueryConstraint[] = [];

  if (region !== 'ALL') {
    constraints.push(where('region', '==', region));
  } else if (allowedRegions.length > 0 && allowedRegions.length <= 10) {
    constraints.push(where('region', 'in', allowedRegions));
  }

  if (status !== 'ALL') {
    constraints.push(where('status', '==', status));
  }

  if (expiringDays) {
    const now = new Date();
    const expiringDate = new Date(now.setDate(now.getDate() + expiringDays));
    constraints.push(where('expiresAt', '<=', expiringDate));
    constraints.push(orderBy('expiresAt', 'asc'));
  }

  constraints.push(orderBy('createdAt', 'desc'));

  if (pageParam) {
    constraints.push(startAfter(pageParam));
  }

  constraints.push(limit(limitNum + 1));

  const snapshot = await getDocs(query(collection(firestore, 'members'), ...constraints));
  const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Profile));

  const nextPage = users.length > limitNum ? snapshot.docs[limitNum] : undefined;
  if (nextPage) {
    users.pop();
  }

  return { users, nextPage };
};
