import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHookWithProviders, waitFor } from '@/test-utils';
import { useExportJobs } from '@/hooks/useExportJobs';

declare const __setFunctionsResponse: (
  impl: (name: string, payload: any) => any
) => void;
declare const __resetFunctions: () => void;

describe('useExportJobs', () => {
  beforeEach(() => {
    vi.useRealTimers();
    __resetFunctions();
  });

  it('loads export jobs and sorts them by recency', async () => {
    __setFunctionsResponse((name: string) => {
      if (name === 'getMyExports') {
        return {
          jobs: [
            {
              id: 'exp-1',
              type: 'members_csv',
              status: 'success',
              createdAt: '2025-01-01T10:00:00.000Z',
              finishedAt: '2025-01-01T10:01:00.000Z',
              rows: 10,
              size: 1024,
              url: 'https://storage.example.com/exp-1.csv',
            },
            {
              id: 'exp-2',
              type: 'members_csv',
              status: 'running',
              startedAt: '2025-01-01T11:00:00.000Z',
              progress: { rows: 5, bytes: 2048 },
            },
          ],
        };
      }
      if (name === 'getExportStatus') {
        return {
          id: 'exp-2',
          type: 'members_csv',
          status: 'running',
          startedAt: '2025-01-01T11:00:00.000Z',
          progress: { rows: 5, bytes: 2048 },
        };
      }
      return {};
    });

    const { result } = renderHookWithProviders(() => useExportJobs());

    await waitFor(() => {
      expect(result.current.jobs.length).toBe(2);
    });
    expect(result.current.jobs[0].id).toBe('exp-2');
    expect(result.current.jobs[0].progressRows).toBe(5);
    expect(result.current.jobs[0].progressBytes).toBe(2048);
    expect(result.current.jobs[1].id).toBe('exp-1');
    expect(result.current.jobs[1].url).toContain('exp-1.csv');
  });

  it('refreshJob updates the job in cache', async () => {
    let exportStatus = {
      id: 'exp-9',
      type: 'members_csv',
      status: 'running',
      startedAt: '2025-01-01T12:00:00.000Z',
      progress: { rows: 2, bytes: 500 },
    };

    __setFunctionsResponse((name: string) => {
      if (name === 'getMyExports') {
        return {
          jobs: [
            {
              id: 'exp-9',
              type: 'members_csv',
              status: 'running',
              startedAt: '2025-01-01T12:00:00.000Z',
              progress: { rows: 2, bytes: 500 },
            },
          ],
        };
      }
      if (name === 'getExportStatus') {
        return exportStatus;
      }
      return {};
    });

    const { result } = renderHookWithProviders(() => useExportJobs());

    await waitFor(() => {
      expect(result.current.jobs[0].status).toBe('running');
    });

    exportStatus = {
      id: 'exp-9',
      type: 'members_csv',
      status: 'success',
      finishedAt: '2025-01-01T12:05:00.000Z',
      rows: 10,
      size: 10_240,
      url: 'https://storage.example.com/exp-9.csv',
    };

    await result.current.refreshJob('exp-9');

    await waitFor(() => {
      expect(result.current.jobs[0].status).toBe('success');
      expect(result.current.jobs[0].url).toContain('exp-9.csv');
      expect(result.current.jobs[0].rows).toBe(10);
      expect(result.current.jobs[0].sizeBytes).toBe(10_240);
    });
  });
});
