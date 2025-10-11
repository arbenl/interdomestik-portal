import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from './z.js';

type AuthFixtureUser = {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  [key: string]: unknown;
};

type AuthContextFixture = {
  user: AuthFixtureUser | null;
  loading: boolean;
  isAdmin: boolean;
  isAgent: boolean;
  allowedRegions: string[];
  mfaEnabled: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOutUser: () => Promise<void>;
  refreshClaims?: () => Promise<void>;
};

type FixtureDefinition = {
  name: string;
  description: string;
  context: AuthContextFixture;
};

type FixtureName = 'admin' | 'agent' | 'member' | 'guest' | 'loading';

const asyncNoop = async () => {};

function toAuthUser(overrides?: Record<string, unknown>) {
  return {
    uid: `uid-${(overrides?.uid as string | undefined) ?? 'user'}`,
    email: (overrides?.email as string | undefined) ?? 'user@example.com',
    displayName: (overrides?.displayName as string | undefined) ?? 'Test User',
    ...overrides,
  } as AuthFixtureUser;
}

function makeBaseContext(
  overrides?: Partial<AuthContextFixture>
): AuthContextFixture {
  const defaultUser = toAuthUser();

  const base: AuthContextFixture = {
    user: defaultUser,
    loading: false,
    isAdmin: false,
    isAgent: false,
    allowedRegions: [],
    mfaEnabled: false,
    signIn: asyncNoop,
    signUp: asyncNoop,
    signOutUser: asyncNoop,
    refreshClaims: asyncNoop,
  };

  return {
    ...base,
    ...overrides,
    user:
      overrides && 'user' in overrides
        ? (overrides.user as AuthContextFixture['user'])
        : defaultUser,
  };
}

const FIXTURES: Record<FixtureName, FixtureDefinition> = {
  admin: {
    name: 'admin',
    description: 'Authenticated administrator with full access.',
    context: makeBaseContext({
      user: toAuthUser({
        uid: 'uid-admin',
        email: 'admin@example.com',
        displayName: 'Admin User',
      }),
      isAdmin: true,
      allowedRegions: ['us', 'eu'],
    }),
  },
  agent: {
    name: 'agent',
    description: 'Authenticated support agent with limited admin tools.',
    context: makeBaseContext({
      user: toAuthUser({
        uid: 'uid-agent',
        email: 'agent@example.com',
        displayName: 'Agent User',
      }),
      isAgent: true,
      allowedRegions: ['us'],
    }),
  },
  member: {
    name: 'member',
    description: 'Authenticated member without elevated privileges.',
    context: makeBaseContext({
      user: toAuthUser({
        uid: 'uid-member',
        email: 'member@example.com',
        displayName: 'Member User',
      }),
    }),
  },
  guest: {
    name: 'guest',
    description: 'Unauthenticated visitor.',
    context: makeBaseContext({
      user: null,
    }),
  },
  loading: {
    name: 'loading',
    description: 'Auth state still resolving (spinner state).',
    context: makeBaseContext({
      loading: true,
      user: null,
    }),
  },
};

function buildContextFromRole(role: 'admin' | 'agent' | 'member' | 'guest') {
  switch (role) {
    case 'admin':
      return FIXTURES.admin.context;
    case 'agent':
      return FIXTURES.agent.context;
    case 'member':
      return FIXTURES.member.context;
    case 'guest':
    default:
      return FIXTURES.guest.context;
  }
}

export function registerAuthFixturesTools(server: McpServer) {
  server.registerTool(
    'list-auth-fixtures',
    {
      title: 'List Auth Context Fixtures',
      description: 'Enumerate canned AuthContext states for tests and stories.',
      outputSchema: {
        fixtures: z.array(
          z.object({
            name: z.string(),
            description: z.string(),
          })
        ),
      },
    },
    async () => {
      const fixtures = Object.values(FIXTURES).map(({ name, description }) => ({
        name,
        description,
      }));
      const structured = { fixtures };
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(structured, null, 2),
          },
        ],
        structuredContent: structured,
      };
    }
  );

  server.registerTool(
    'get-auth-fixture',
    {
      title: 'Get Auth Fixture',
      description:
        'Retrieve a predefined AuthContext payload for a specific scenario.',
      inputSchema: {
        name: z.enum(['admin', 'agent', 'member', 'guest', 'loading'] as const),
      },
      outputSchema: {
        name: z.string(),
        description: z.string(),
        context: z.object({
          user: z.any(),
          loading: z.boolean(),
          isAdmin: z.boolean(),
          isAgent: z.boolean(),
          allowedRegions: z.array(z.string()),
          mfaEnabled: z.boolean(),
        }),
      },
    },
    async ({ name }) => {
      const fixture = FIXTURES[name as FixtureName];
      const output = {
        name: fixture.name,
        description: fixture.description,
        context: fixture.context,
      };
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(output, null, 2),
          },
        ],
        structuredContent: output,
      };
    }
  );

  server.registerTool(
    'build-auth-context',
    {
      title: 'Build Custom Auth Context',
      description:
        'Create an AuthContext object by starting from a role template and applying overrides.',
      inputSchema: {
        role: z.enum(['admin', 'agent', 'member', 'guest'] as const).optional(),
        user: z
          .union([
            z
              .object({
                uid: z.string().optional(),
                email: z.string().email().optional(),
                displayName: z.string().optional(),
                photoURL: z.string().url().optional(),
              })
              .strict()
              .partial(),
            z.null(),
          ])
          .optional(),
        loading: z.boolean().optional(),
        isAdmin: z.boolean().optional(),
        isAgent: z.boolean().optional(),
        allowedRegions: z.array(z.string()).optional(),
        mfaEnabled: z.boolean().optional(),
      },
      outputSchema: {
        context: z.object({
          user: z.any(),
          loading: z.boolean(),
          isAdmin: z.boolean(),
          isAgent: z.boolean(),
          allowedRegions: z.array(z.string()),
          mfaEnabled: z.boolean(),
        }),
      },
    },
    async (input) => {
      const { role, user, ...rest } = input;
      const base =
        role !== undefined
          ? buildContextFromRole(role)
          : FIXTURES.member.context;

      const context = makeBaseContext({
        ...base,
        ...rest,
        user:
          user !== undefined
            ? user === null
              ? null
              : (toAuthUser(user ?? undefined) as AuthContextFixture['user'])
            : base.user,
        isAdmin:
          rest.isAdmin !== undefined
            ? rest.isAdmin
            : role === 'admin'
              ? true
              : base.isAdmin,
        isAgent:
          rest.isAgent !== undefined
            ? rest.isAgent
            : role === 'agent'
              ? true
              : role === 'admin'
                ? false
                : base.isAgent,
        allowedRegions: rest.allowedRegions ?? base.allowedRegions ?? [],
        loading: rest.loading ?? base.loading ?? false,
        mfaEnabled: rest.mfaEnabled ?? base.mfaEnabled ?? false,
      });

      const output = { context };
      return {
        content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
        structuredContent: output,
      };
    }
  );
}
