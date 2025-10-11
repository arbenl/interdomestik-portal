import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { execa } from 'execa';
import { z } from './z.js';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// packages/mcp/src -> repo root
const repoRoot = resolve(__dirname, '..', '..', '..');

type TestCommandName =
  | 'frontend:test'
  | 'frontend:test:role-protected-route'
  | 'frontend:test:ci'
  | 'frontend:e2e'
  | 'functions:test'
  | 'rules:test';

type TestCommand = {
  name: TestCommandName;
  description: string;
  args: string[];
  cwd?: string;
};

const TEST_COMMAND_LIST: readonly TestCommand[] = [
  {
    name: 'frontend:test',
    description: 'Run the full frontend Vitest suite',
    args: ['--filter', 'frontend', 'test'],
  },
  {
    name: 'frontend:test:role-protected-route',
    description: 'Run the RoleProtectedRoute Vitest file in watchless mode',
    args: ['--filter', 'frontend', 'test', '--', 'RoleProtectedRoute.test.tsx'],
  },
  {
    name: 'frontend:test:ci',
    description: 'Run frontend tests with coverage (CI mode)',
    args: ['--filter', 'frontend', 'test:ci'],
  },
  {
    name: 'frontend:e2e',
    description: 'Run Playwright end-to-end tests (requires emulators running)',
    args: ['-F', 'frontend', 'e2e'],
  },
  {
    name: 'functions:test',
    description: 'Run Firebase Functions mocha suite against emulators',
    args: ['--filter', 'functions', 'test'],
  },
  {
    name: 'rules:test',
    description: 'Run Firestore security rule tests',
    args: ['test:rules'],
  },
] as const;

const TEST_COMMANDS: Record<TestCommandName, TestCommand> = Object.fromEntries(
  TEST_COMMAND_LIST.map((command) => [command.name, command])
) as Record<TestCommandName, TestCommand>;

const TEST_COMMAND_NAMES = TEST_COMMAND_LIST.map(
  (command) => command.name
) as unknown as readonly [TestCommandName, ...TestCommandName[]];

async function executeTestCommand(
  command: TestCommand,
  extraArgs?: string[],
  streamToLogOnFailure = true
) {
  const start = Date.now();
  const args = [...command.args, ...(extraArgs ?? [])];

  const logDir = resolve(repoRoot, 'frontend', 'test-results', 'mcp-logs');
  const fs = await import('node:fs');
  try {
    fs.mkdirSync(logDir, { recursive: true });
  } catch {}
  const logPath = resolve(logDir, `run-${Date.now()}.log`);
  const logStream = fs.createWriteStream(logPath, { flags: 'a' });

  const subprocess = execa('pnpm', args, {
    cwd: command.cwd ?? repoRoot,
    reject: false,
    all: true,
    env: {
      ...process.env,
      CI: process.env.CI ?? 'false',
    },
  });

  subprocess.all?.on('data', (chunk: Buffer) => {
    logStream.write(chunk);
  });

  const { exitCode, stdout, stderr } = await subprocess;
  logStream.end();

  const durationMs = Date.now() - start;
  return {
    exitCode,
    succeeded: exitCode === 0,
    durationMs,
    stdout: (stdout ?? '').trim(),
    stderr: (stderr ?? '').trim(),
    executed: ['pnpm', ...args],
    logFile: `frontend/test-results/mcp-logs/${logPath.split('/').slice(-1)[0]}`,
  } as const;
}

export function registerTestOrchestratorTools(server: McpServer) {
  server.registerTool(
    'list-test-commands',
    {
      title: 'List Test Commands',
      description: 'Enumerate available pnpm test commands for this repo.',
      outputSchema: {
        commands: z.array(
          z.object({
            name: z.string(),
            description: z.string(),
            args: z.array(z.string()),
          })
        ),
      },
    },
    async () => {
      const commands = Object.values(TEST_COMMANDS).map(
        ({ name, description, args }) => ({
          name,
          description,
          args,
        })
      );
      const output = { commands };
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
    'run-test-command',
    {
      title: 'Run Test Command',
      description:
        'Execute a predefined test command and return its output and exit status.',
      inputSchema: {
        name: z.enum(TEST_COMMAND_NAMES),
        extraArgs: z.array(z.string()).optional(),
      },
      outputSchema: {
        exitCode: z.number().nullable(),
        succeeded: z.boolean(),
        durationMs: z.number(),
        stdout: z.string(),
        stderr: z.string(),
        executed: z.array(z.string()),
        logFile: z.string().optional(),
      },
    },
    async ({
      name,
      extraArgs,
    }: {
      name?: TestCommandName;
      extraArgs?: string[];
    }) => {
      const command = name ? TEST_COMMANDS[name] : undefined;
      if (!command) {
        const message = `Unknown test command: ${name}`;
        return {
          content: [{ type: 'text', text: message }],
          isError: true,
        };
      }

      const result = await executeTestCommand(command, extraArgs);
      return {
        content: [
          {
            type: 'text',
            text: [
              `Command: ${result.executed.join(' ')}`,
              `Exit code: ${result.exitCode}`,
              `Duration: ${result.durationMs}ms`,
              result.logFile ? `Log file: ${result.logFile}` : '',
              result.stdout ? `stdout:\n${result.stdout}` : '',
              result.stderr ? `stderr:\n${result.stderr}` : '',
            ]
              .filter(Boolean)
              .join('\n\n'),
          },
        ],
        structuredContent: result,
      };
    }
  );
}
