import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Timestamp,
  collection,
  getDocs,
  orderBy,
  query,
  where,
  type DocumentData,
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase';

export type PortalEvent = {
  id: string;
  title: string;
  date: Date | null;
  location: string;
  focus: string;
  tags: string[];
  regions: string[];
};

const PLACEHOLDER_EVENTS: PortalEvent[] = [
  {
    id: 'summit-eu',
    title: 'Quarterly Member Summit',
    date: new Date('2025-10-12T00:00:00Z'),
    location: 'Madrid, ES',
    focus: 'Regional policy updates • Partner showcase',
    tags: ['conference', 'my-region'],
    regions: ['EUROPE', 'IBERIA'],
  },
  {
    id: 'webinar-renewals',
    title: 'Retention Playbook Workshop',
    date: new Date('2025-11-02T00:00:00Z'),
    location: 'Virtual',
    focus: 'Renewal automations • Outreach cadences',
    tags: ['workshop', 'virtual', 'my-region'],
    regions: ['REMOTE'],
  },
  {
    id: 'meetup-nl',
    title: 'Benelux Member Meetup',
    date: new Date('2025-11-18T00:00:00Z'),
    location: 'Amsterdam, NL',
    focus: 'Cross-border billing • Member spotlights',
    tags: ['meetup'],
    regions: ['BENELUX'],
  },
  {
    id: 'workshop-uk',
    title: 'UK Compliance Workshop',
    date: new Date('2025-09-30T00:00:00Z'),
    location: 'London, UK',
    focus: 'Post-Brexit requirements • Support playbooks',
    tags: ['workshop'],
    regions: ['UK'],
  },
];

function isFlagEnabled(): boolean {
  const raw = String(import.meta.env?.VITE_FLAG_PORTAL_EVENTS ?? '').trim();
  if (['1', 'true', 'TRUE'].includes(raw)) return true;
  if (typeof window !== 'undefined') {
    const override = window.localStorage?.getItem('flag.portalEvents');
    if (override) {
      const normalized = override.trim().toLowerCase();
      return ['1', 'true', 'on', 'enabled', 'yes'].includes(normalized);
    }
  }
  return false;
}

const nowIso = () => new Date().toISOString();

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (
    typeof value === 'object' &&
    value !== null &&
    'toDate' in value &&
    typeof (value as { toDate?: () => Date }).toDate === 'function'
  ) {
    const converted = (value as { toDate: () => Date }).toDate();
    return Number.isNaN(converted.getTime()) ? null : converted;
  }
  if (typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (
    typeof value === 'object' &&
    value !== null &&
    'seconds' in value &&
    typeof (value as { seconds: number }).seconds === 'number'
  ) {
    const millis = (value as { seconds: number }).seconds * 1000;
    const parsed = new Date(millis);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

function normalizeEvent(doc: DocumentData): PortalEvent {
  const tags = Array.isArray(doc.tags)
    ? doc.tags.map((tag: unknown) => String(tag))
    : [];
  const regions = Array.isArray(doc.regions)
    ? doc.regions.map((region: unknown) => String(region))
    : [];
  return {
    id: String(doc.id ?? doc.slug ?? nowIso()),
    title: String(doc.title ?? 'Untitled event'),
    date: toDate(doc.startAt ?? doc.date),
    location: String(doc.location ?? 'TBA'),
    focus: String(doc.focus ?? ''),
    tags,
    regions,
  };
}

export function usePortalEvents() {
  const enabled = isFlagEnabled();

  const queryResult = useQuery<PortalEvent[], Error>({
    queryKey: ['portal-events'],
    queryFn: async () => {
      const cutoff = Timestamp.fromMillis(
        Date.now() - 7 * 24 * 3600 * 1000
      );
      const baseQuery = query(
        collection(firestore, 'events'),
        where('startAt', '>=', cutoff),
        orderBy('startAt', 'asc')
      );
      const snapshot = await getDocs(baseQuery);
      return snapshot.docs.map((doc) =>
        normalizeEvent({ id: doc.id, ...doc.data() })
      );
    },
    enabled,
    staleTime: 60_000,
  });

  const events = useMemo<PortalEvent[]>(() => {
    if (!enabled) return PLACEHOLDER_EVENTS;
    return queryResult.data ?? [];
  }, [enabled, queryResult.data]);

  return {
    events,
    isEnabled: enabled,
    isLoading: enabled && queryResult.isLoading,
    isError: enabled && !!queryResult.error,
    error: queryResult.error ?? null,
    refetch: queryResult.refetch,
  };
}

export default usePortalEvents;
