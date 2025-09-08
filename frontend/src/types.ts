export type Profile = {
  id?: string;
  email?: string;
  name?: string;
  region?: string;
  phone?: string;
  orgId?: string;
  memberNo?: string;
  status?: 'active' | 'expired' | 'none';
  year?: number | null;
  expiresAt?: { seconds: number; nanoseconds?: number } | null;
  createdAt?: { seconds: number; nanoseconds?: number };
  updatedAt?: { seconds: number; nanoseconds?: number };
};

export type Membership = {
  id?: string;
  year?: number;
  status: 'active' | 'expired' | 'pending' | string;
  startedAt?: { seconds: number; nanoseconds?: number };
  expiresAt?: { seconds: number; nanoseconds?: number };
  price?: number;
  currency?: 'EUR' | string;
  paymentMethod?: 'cash' | 'card' | 'bank' | 'other' | string;
  externalRef?: string | null;
  updatedAt?: { seconds: number; nanoseconds?: number };
};

export type EventItem = {
  id: string;
  title: string;
  startAt?: { seconds: number; nanoseconds?: number };
  location?: string;
  createdAt?: { seconds: number; nanoseconds?: number };
};

export type Invoice = {
  id: string;
  invoiceId: string;
  amount: number; // cents
  currency: string;
  status: string;
  created?: { seconds: number; nanoseconds: number };
};

