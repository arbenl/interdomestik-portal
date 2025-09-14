import type { ReactElement, ReactNode, FC } from 'react';
import {
  render as rtlRender,
  renderHook as rtlRenderHook,
  screen,
  waitFor,
  fireEvent,
  within,
  type RenderHookOptions,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, type MemoryRouterProps } from 'react-router-dom';
import { QueryClient, QueryClientProvider, type QueryClientConfig } from '@tanstack/react-query';

export function createTestQueryClient(cfg?: QueryClientConfig) {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
    ...cfg,
  });
}

export function TestProviders({
  children, initialEntries, queryClient,
}: { children: ReactNode; initialEntries?: MemoryRouterProps['initialEntries']; queryClient?: QueryClient; }) {
  const client = queryClient ?? createTestQueryClient();
  return (
    <MemoryRouter initialEntries={initialEntries}>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </MemoryRouter>
  );
}

export function renderWithProviders(
  ui: ReactElement,
  options?: { initialEntries?: MemoryRouterProps['initialEntries']; queryClient?: QueryClient }
) {
  const { initialEntries, queryClient } = options ?? {};
  return rtlRender(ui, {
    wrapper: ({ children }) => (
      <TestProviders initialEntries={initialEntries} queryClient={queryClient}>
        {children}
      </TestProviders>
    ),
  });
}

export function renderHookWithProviders<Result, Props>(
  hook: (props: Props) => Result,
  options?: RenderHookOptions<Props> & { initialEntries?: MemoryRouterProps['initialEntries']; queryClient?: QueryClient }
) {
  const { initialEntries, queryClient, ...rtlOptions } = options ?? {};
  const client = queryClient ?? createTestQueryClient();
  const Wrapper: FC<{ children: ReactNode }> = ({ children }) => (
    <MemoryRouter initialEntries={initialEntries}>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </MemoryRouter>
  );
  return rtlRenderHook(hook, { wrapper: Wrapper, ...rtlOptions });
}

export { screen, waitFor, fireEvent, userEvent, within };
