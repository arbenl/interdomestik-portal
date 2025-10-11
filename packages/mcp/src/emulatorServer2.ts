import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from './z.js';
import { execa } from 'execa';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = resolve(__dirname, '..', '..', '..');

const runE2eSuiteInput = {
  headed: z.boolean().optional().default(false),
  trace: z.boolean().optional().default(false),
};

const commandOutput = z.object({
  pass: z.boolean(),
  duration: z.number(),
  stdout: z.string(),
  stderr: z.string(),
  artifacts: z.array(z.string()).optional(),
});

async function runCommand(
  command: string,
  args: string[],
  env: Record<string, string> = {}
) {
  const startTime = Date.now();
  try {
    const { stdout, stderr } = await execa(command, args, {
      cwd: repoRoot,
      env: { ...process.env, ...env },
    });
    const duration = Date.now() - startTime;
    return { pass: true, duration, stdout, stderr };
  } catch (e: any) {
    const duration = Date.now() - startTime;
    return {
      pass: false,
      duration,
      stdout: e.stdout ?? '',
      stderr: e.stderr ?? '',
    };
  }
}

function collectPlaywrightArtifacts(): string[] {
  const paths = ['frontend/test-results', 'frontend/playwright-report'];
  const existing: string[] = [];
  for (const p of paths) {
    try {
      // lazily check existence without throwing
      const fs = require('node:fs');
      if (fs.existsSync(resolve(repoRoot, p))) existing.push(p);
    } catch {
      // ignore
    }
  }
  return existing;
}

export function registerEmulatorTools2(server: McpServer) {
  server.registerTool(
    'seed-emulators',
    {
      title: 'Seed Emulators',
      description: 'Seeds the Firebase emulators with data.',
      inputSchema: {},
      outputSchema: commandOutput,
    },
    async () => {
      const result = await runCommand('pnpm', ['dev:seed']);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        structuredContent: result,
      };
    }
  );

  server.registerTool(
    'reset-emulators',
    {
      title: 'Reset Emulators',
      description: 'Stops and restarts the Firebase emulators.',
      inputSchema: {},
      outputSchema: commandOutput, // This will only reflect the last command
    },
    async () => {
      await runCommand('pnpm', ['dev:stop']);
      // This will run in the background, so we can't easily get a result
      execa('pnpm', ['dev:emu'], { cwd: repoRoot, detached: true });
      const result = {
        pass: true,
        duration: 0,
        stdout: 'Emulators are restarting',
        stderr: '',
      };
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        structuredContent: result,
      };
    }
  );

  server.registerTool(
    'run-e2e-suite',
    {
      title: 'Run E2E Suite',
      description: 'Runs the Playwright E2E test suite.',
      inputSchema: runE2eSuiteInput,
      outputSchema: commandOutput,
    },
    async (input) => {
      const { headed, trace } = input;
      const env: Record<string, string> = {};
      if (headed) env.HEADED = 'true';
      if (trace) env.TRACE = 'true';

      const result = await runCommand('pnpm', ['orchestrate:e2e'], env);

      const artifacts = collectPlaywrightArtifacts();
      const structured = { ...result, artifacts };

      return {
        content: [{ type: 'text', text: JSON.stringify(structured, null, 2) }],
        structuredContent: structured,
      };
    }
  );
}
