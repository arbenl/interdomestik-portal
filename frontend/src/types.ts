export type Profile = {
  id?: string;
  email?: string;
  name?: string;
  region?: string;
  phone?: string;
  orgId?: string;
  memberNo?: string;
  role?: 'member' | 'agent' | 'admin' | string;
  status?: 'active' | 'expired' | 'none';
  year?: number | null;
  expiresAt?: { seconds: number; nanoseconds?: number } | null;
  createdAt?: { seconds: number; nanoseconds?: number };
  updatedAt?: { seconds: number; nanoseconds?: number };
  autoRenew?: boolean;
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

export type MonthlyReport = {
  id: string;
  type: 'monthly';
  month: string; // YYYY-MM
  total?: number;
  revenue?: number;
  byRegion?: Record<string, number>;
  byMethod?: Record<string, number>;
  updatedAt?: { seconds: number; nanoseconds?: number };
};

export type AuditLog = {
  id: string;
  action: string;
  actor?: string;
  target?: string;
  role?: string;
  allowedRegions?: string[];
  year?: number;
  amount?: number;
  currency?: string;
  method?: string;
  ts?: { seconds: number; nanoseconds?: number };
};

export type Organization = {
  id: string;
  name: string;
  billingEmail?: string;
  seats: number;
  activeSeats?: number;
  createdAt?: { seconds: number; nanoseconds?: number };
};

export type Coupon = {
  id: string; // code (lowercased)
  percentOff?: number;
  amountOff?: number; // cents
  active?: boolean;
  updatedAt?: { seconds: number; nanoseconds?: number };
};
