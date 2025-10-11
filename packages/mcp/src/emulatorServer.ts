import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { spawn, ChildProcessWithoutNullStreams } from 'node:child_process';
import { z } from './z.js';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = resolve(__dirname, '..', '..');

type EmulatorMode = 'default' | 'seeded';

type EmulatorState = {
  mode: EmulatorMode;
  process: ChildProcessWithoutNullStreams;
  startedAt: number;
  command: string[];
  logBuffer: string;
};

const LOG_LIMIT = 10_000;

const StartEmulatorInput = {
  mode: z.enum(['default', 'seeded']).optional(),
};

const EmulatorLogsInput = {
  tail: z.number().optional(),
};

let emulatorState: EmulatorState | null = null;

type ToolRequestExtra = {
  request?: {
    params?: {
      arguments?: unknown;
    };
  };
};

function readToolArguments(extra: unknown) {
  return (
    (extra as ToolRequestExtra | undefined)?.request?.params?.arguments ?? {}
  );
}

function appendLog(state: EmulatorState | null, chunk: Buffer | string) {
  if (!state) return;
  const text = chunk.toString();
  const updated = (state.logBuffer + text).slice(-LOG_LIMIT);
  state.logBuffer = updated;
}

function formatLogOutput(state: EmulatorState | null, length?: number) {
  if (!state) return '';
  if (!length || state.logBuffer.length <= length) {
    return state.logBuffer;
  }
  return state.logBuffer.slice(-length);
}

function startEmulatorProcess(mode: EmulatorMode) {
  if (emulatorState) {
    // Already running; return current state without error
    return emulatorState;
  }

  const args = mode === 'seeded' ? ['dev:emu:seed'] : ['dev:emu'];

  const child = spawn('pnpm', args, {
    cwd: repoRoot,
    env: {
      ...process.env,
      FORCE_COLOR: '1',
    },
    stdio: 'pipe',
  });

  const state: EmulatorState = {
    mode,
    process: child,
    startedAt: Date.now(),
    command: ['pnpm', ...args],
    logBuffer: '',
  };

  child.stdout.on('data', (chunk) => appendLog(state, chunk));
  child.stderr.on('data', (chunk) => appendLog(state, chunk));

  child.on('exit', (code, signal) => {
    appendLog(
      state,
      `\n[emulator] exited with code ${code ?? 'null'} signal ${signal ?? 'null'}\n`
    );
    emulatorState = null;
  });

  emulatorState = state;
  return state;
}

async function stopEmulatorProcess() {
  const state = emulatorState;
  if (!state) {
    throw new Error('Emulators are not running');
  }

  return await new Promise<void>((resolveStop) => {
    const onExit = () => resolveStop();

    state.process.once('exit', onExit);
    appendLog(state, '\n[emulator] terminating…\n');
    state.process.kill('SIGINT');

    setTimeout(() => {
      if (emulatorState) {
        appendLog(state, '\n[emulator] forcing shutdown with SIGTERM\n');
        state.process.kill('SIGTERM');
      }
    }, 5000);
  });
}

function currentStatus() {
  if (!emulatorState) {
    return {
      running: false,
      pid: null as number | null,
      mode: null as EmulatorMode | null,
      startedAt: null as string | null,
      command: null as string[] | null,
    };
  }

  return {
    running: true,
    pid: emulatorState.process.pid ?? null,
    mode: emulatorState.mode,
    startedAt: new Date(emulatorState.startedAt).toISOString(),
    command: emulatorState.command,
  };
}

function registerShutdownHook() {
  const shutdown = () => {
    if (emulatorState?.process.pid) {
      emulatorState.process.kill('SIGINT');
    }
  };

  process.on('exit', shutdown);
  process.on('SIGINT', () => {
    shutdown();
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    shutdown();
    process.exit(0);
  });
}

export function registerEmulatorTools(server: McpServer) {
  registerShutdownHook();

  server.registerTool(
    'emulator-status',
    {
      title: 'Emulator Status',
      description: 'Report whether Firebase emulators are running.',
      outputSchema: {
        running: z.boolean(),
        pid: z.number().nullable(),
        mode: z.enum(['default', 'seeded']).nullable(),
        startedAt: z.string().nullable(),
        command: z.array(z.string()).nullable(),
      },
    },
    async () => {
      const status = currentStatus();
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(status, null, 2),
          },
        ],
        structuredContent: status,
      };
    }
  );

  server.registerTool(
    'start-emulators',
    {
      title: 'Start Firebase Emulators',
      description:
        'Launch pnpm dev:emu (or dev:emu:seed) so local Firebase services are available.',
      inputSchema: StartEmulatorInput,
      outputSchema: {
        running: z.boolean(),
        pid: z.number().nullable(),
        mode: z.enum(['default', 'seeded']).nullable(),
        startedAt: z.string().nullable(),
        command: z.array(z.string()).nullable(),
      },
    },
    async ({ mode }) => {
      const state = startEmulatorProcess(mode ?? 'default');
      const status = currentStatus();
      const message =
        emulatorState && emulatorState.process.pid === state.process.pid
          ? `Emulators running (PID ${state.process.pid}) in ${state.mode} mode.`
          : `Emulators started (PID ${state.process.pid}) in ${state.mode} mode.`;
      return {
        content: [
          {
            type: 'text',
            text: message,
          },
        ],
        structuredContent: status,
      };
    }
  );

  server.registerTool(
    'stop-emulators',
    {
      title: 'Stop Firebase Emulators',
      description:
        'Terminate running emulator processes started by this server.',
      outputSchema: {
        stopped: z.boolean(),
      },
    },
    async () => {
      if (!emulatorState) {
        return {
          content: [{ type: 'text', text: 'Emulators are not running.' }],
          structuredContent: { stopped: false },
        };
      }

      await stopEmulatorProcess();
      return {
        content: [{ type: 'text', text: 'Emulators stopped.' }],
        structuredContent: { stopped: true },
      };
    }
  );

  server.registerTool(
    'emulator-logs',
    {
      title: 'Tail Emulator Logs',
      description:
        'Retrieve recent stdout/stderr output captured from the running emulators.',
      inputSchema: EmulatorLogsInput,
      outputSchema: {
        logs: z.string(),
        running: z.boolean(),
      },
    },
    async ({ tail }) => {
      const logs = formatLogOutput(emulatorState, tail ?? undefined);
      const running = Boolean(emulatorState);
      return {
        content: [
          {
            type: 'text',
            text: logs || '[no logs captured]',
          },
        ],
        structuredContent: { logs, running },
      };
    }
  );
}
