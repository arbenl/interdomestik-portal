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
import { resolve } from 'node:path';
import { vi } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio';
import type { AuthContextType } from '@/context/AuthContext';
import { useAuth } from '@/hooks/useAuth';
import { makeUser } from '@/tests/factories/user';
import { createTestQueryClient } from './tests/helpers';

const AUTH_FIXTURES_COMMAND = process.env.MCP_AUTH_SERVER_COMMAND ?? 'pnpm';
const AUTH_FIXTURES_ARGS = process.env.MCP_AUTH_SERVER_ARGS?.split(' ').filter(
  Boolean
) ?? ['mcp'];

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

export type BuildAuthContextOptions = {
  role?: 'admin' | 'agent' | 'member' | 'guest';
  user?: {
    uid?: string;
    email?: string;
    displayName?: string;
    photoURL?: string;
  } | null;
  loading?: boolean;
  isAdmin?: boolean;
  isAgent?: boolean;
  allowedRegions?: string[];
  mfaEnabled?: boolean;
};

export async function buildAuthContextFixture(
  options?: BuildAuthContextOptions
): Promise<AuthContextType & { refreshClaims: () => Promise<void> }> {
  // Ensure we spawn the MCP server from the workspace root where the `mcp` script exists
  const repoRoot = resolve(process.cwd(), '..');
  const transport = new StdioClientTransport({
    command: AUTH_FIXTURES_COMMAND,
    args: AUTH_FIXTURES_ARGS,
    cwd: repoRoot,
    env: {
      ...process.env,
      FORCE_COLOR: '0',
    },
  });

  const client = new Client(
    { name: 'frontend-tests', version: '0.1.0' },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  await client.connect(transport);

  try {
    const result = await client.callTool({
      name: 'build-auth-context',
      arguments: options ?? {},
    });

    const context = result?.structuredContent?.context as
      | {
          user: unknown;
          loading: boolean;
          isAdmin: boolean;
          isAgent: boolean;
          allowedRegions: string[];
          mfaEnabled: boolean;
        }
      | undefined;

    if (!context) {
      throw new Error('Auth fixtures server returned no context payload.');
    }

    return {
      user: (context.user as User | null) ?? null,
      loading: Boolean(context.loading),
      isAdmin: Boolean(context.isAdmin),
      isAgent: Boolean(context.isAgent),
      allowedRegions: Array.isArray(context.allowedRegions)
        ? [...context.allowedRegions]
        : [],
      mfaEnabled: Boolean(context.mfaEnabled),
      refreshClaims: vi.fn(async () => {}),
      signIn: vi.fn(async () => {}),
      signUp: vi.fn(async () => {}),
      signOutUser: vi.fn(async () => {}),
    };
  } finally {
    await client.close();
  }
}
