/* eslint-disable react-refresh/only-export-components */
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
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { User } from 'firebase/auth';
import { MemoryRouter, type MemoryRouterProps } from 'react-router-dom';
import { vi } from 'vitest';
import type { AuthContextType } from '@/context/AuthContext';
import { useAuth } from '@/hooks/useAuth';
import { makeUser } from '@/tests/factories/user';
import { createTestQueryClient } from './tests/helpers';

export function TestProviders({
  children,
  initialEntries,
  queryClient,
}: {
  children: ReactNode;
  initialEntries?: MemoryRouterProps['initialEntries'];
  queryClient?: QueryClient;
}) {
  const client = queryClient ?? createTestQueryClient();
  return (
    <MemoryRouter initialEntries={initialEntries}>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </MemoryRouter>
  );
}

export function renderWithProviders(
  ui: ReactElement,
  options?: {
    initialEntries?: MemoryRouterProps['initialEntries'];
    queryClient?: QueryClient;
  }
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
  options?: RenderHookOptions<Props> & {
    initialEntries?: MemoryRouterProps['initialEntries'];
    queryClient?: QueryClient;
  }
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

type MockUseAuthParams = Omit<Partial<AuthContextType>, 'user'> & {
  user?: Partial<User> | null;
};

export function mockUseAuth(overrides?: MockUseAuthParams) {
  const { user: userOverride, ...rest } = overrides ?? {};
  const defaultUser = makeUser();
  const user =
    userOverride === null
      ? null
      : ({
          ...defaultUser,
          ...(userOverride ?? {}),
        } as User);

  const defaultValue: AuthContextType = {
    user,
    loading: false,
    isAdmin: false,
    isAgent: false,
    allowedRegions: [],
    mfaEnabled: false,
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOutUser: vi.fn(),
  };

  vi.mocked(useAuth).mockReturnValue({
    ...defaultValue,
    ...rest,
    user,
  });
}

export { screen, waitFor, fireEvent, userEvent, within, createTestQueryClient };
