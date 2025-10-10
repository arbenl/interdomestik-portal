import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import callFn from '@/services/functionsClient';

export type ExportJobStatus =
  | 'pending'
  | 'running'
  | 'success'
  | 'error'
  | 'cancelled'
  | string;

export type ExportJob = {
  id: string;
  type: string;
  status: ExportJobStatus;
  createdBy?: string;
  createdAt: Date | null;
  startedAt: Date | null;
  finishedAt: Date | null;
  path?: string | null;
  url?: string | null;
  rows?: number | null;
  sizeBytes?: number | null;
  progressRows?: number | null;
  progressBytes?: number | null;
  error?: string | null;
  columns?: string[];
  filters?: Record<string, unknown> | undefined;
};

type GetMyExportsResponse = {
  jobs?: Array<Record<string, unknown>>;
};

type GetExportStatusResponse = Record<string, unknown>;

const ACTIVE_STATUSES = new Set<ExportJobStatus>(['running', 'pending']);
const QUERY_KEY = ['admin', 'exports'];

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (
    typeof value === 'object' &&
    'toDate' in (value as { toDate?: () => Date }) &&
    typeof (value as { toDate?: () => Date }).toDate === 'function'
  ) {
    const parsed = (value as { toDate: () => Date }).toDate();
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (
    typeof value === 'object' &&
    value !== null &&
    'seconds' in value &&
    typeof (value as { seconds: unknown }).seconds === 'number'
  ) {
    const seconds = (value as { seconds: number }).seconds;
    const millis =
      typeof seconds === 'number' && Number.isFinite(seconds)
        ? seconds * 1000
        : NaN;
    if (Number.isNaN(millis)) return null;
    const parsed = new Date(millis);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

function normalizeJob(raw: Record<string, unknown>): ExportJob {
  const createdAt = toDate(raw.createdAt);
  const startedAt = toDate(raw.startedAt);
  const finishedAt = toDate(raw.finishedAt);
  const progress = (raw.progress ?? {}) as Record<string, unknown>;
  const progressRowsValue = Number(
    progress.rows as number | string | undefined
  );
  const progressRows = Number.isFinite(progressRowsValue)
    ? Math.trunc(progressRowsValue)
    : null;
  const progressBytesValue = Number(
    progress.bytes as number | string | undefined
  );
  const progressBytes = Number.isFinite(progressBytesValue)
    ? progressBytesValue
    : null;
  const rowsValue = Number(raw.rows as number | string | undefined);
  const rows = Number.isFinite(rowsValue)
    ? Math.trunc(rowsValue)
    : progressRows ?? null;
  const sizeValue = Number(raw.size as number | string | undefined);
  const sizeBytes = Number.isFinite(sizeValue)
    ? sizeValue
    : progressBytes ?? null;

  return {
    id: String(raw.id ?? ''),
    type: String(raw.type ?? 'unknown'),
    status: String(raw.status ?? 'pending'),
    createdBy:
      typeof raw.createdBy === 'string' ? String(raw.createdBy) : undefined,
    createdAt,
    startedAt,
    finishedAt,
    path:
      raw.path == null || typeof raw.path === 'string'
        ? (raw.path as string | null | undefined)
        : undefined,
    url:
      raw.url == null || typeof raw.url === 'string'
        ? (raw.url as string | null | undefined)
        : undefined,
    rows,
    sizeBytes,
    progressRows,
    progressBytes,
    error:
      raw.error == null
        ? null
        : typeof raw.error === 'string'
          ? raw.error
          : String(raw.error),
    columns: Array.isArray(raw.columns)
      ? raw.columns.map((col) => String(col))
      : undefined,
    filters:
      raw.filters && typeof raw.filters === 'object'
        ? (raw.filters as Record<string, unknown>)
        : undefined,
  };
}

function sortJobs(jobs: ExportJob[]): ExportJob[] {
  return [...jobs].sort((a, b) => {
    const aTime =
      a.startedAt?.getTime() ??
      a.createdAt?.getTime() ??
      a.finishedAt?.getTime() ??
      0;
    const bTime =
      b.startedAt?.getTime() ??
      b.createdAt?.getTime() ??
      b.finishedAt?.getTime() ??
      0;
    return bTime - aTime;
  });
}

export function useExportJobs() {
  const queryClient = useQueryClient();

  const query = useQuery<ExportJob[], Error>({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const response = await callFn<
        { limit?: number },
        GetMyExportsResponse
      >('getMyExports', { limit: 25 });
      const jobsRaw = Array.isArray(response?.jobs) ? response.jobs : [];
      const jobs = jobsRaw
        .map((job) => normalizeJob(job as Record<string, unknown>))
        .filter((job) => job.id);
      return sortJobs(jobs);
    },
    refetchInterval: (result) => {
      const current = Array.isArray((result as any)?.data)
        ? ((result as { data: ExportJob[] }).data as ExportJob[])
        : undefined;
      if (!current) return false;
      return current.some((job) => ACTIVE_STATUSES.has(job.status))
        ? 5000
        : false;
    },
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: false,
    staleTime: 5_000,
    retry: (failureCount, error) => {
      const code =
        (error as Error & { code?: string })?.code ??
        (error.message?.includes('permission-denied')
          ? 'permission-denied'
          : '');
      if (code === 'permission-denied' || code === 'failed-precondition') {
        return false;
      }
      return failureCount < 2;
    },
  });

  const refresh = useCallback(async () => {
    await query.refetch();
  }, [query]);

  const refreshJob = useCallback(
    async (id: string) => {
      const trimmed = id?.trim();
      if (!trimmed) return null;
      const record = await callFn<{ id: string }, GetExportStatusResponse>(
        'getExportStatus',
        { id: trimmed }
      );
      const normalized = normalizeJob(record);
      queryClient.setQueryData<ExportJob[]>(QUERY_KEY, (current = []) => {
        const next = [...current];
        const index = next.findIndex((job) => job.id === normalized.id);
        if (index === -1) {
          next.unshift(normalized);
        } else {
          next[index] = normalized;
        }
        return sortJobs(next);
      });
      return normalized;
    },
    [queryClient]
  );

  const jobs = query.data ?? [];
  const hasActiveJob = useMemo(
    () => jobs.some((job) => ACTIVE_STATUSES.has(job.status)),
    [jobs]
  );

  return {
    jobs,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error ?? null,
    refresh,
    refreshJob,
    hasActiveJob,
  };
}

export default useExportJobs;
