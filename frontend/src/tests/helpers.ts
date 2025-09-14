import { QueryClient, type QueryClientConfig } from '@tanstack/react-query';

export function createTestQueryClient(cfg?: QueryClientConfig) {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
    ...cfg,
  });
}
