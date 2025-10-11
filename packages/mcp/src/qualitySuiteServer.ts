import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from './z.js';
import { execa } from 'execa';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = resolve(__dirname, '..', '..', '..');

const qualitySuiteInput = {
  // No inputs for now, maybe add ability to skip checks later
};

const commandOutput = z.object({
  pass: z.boolean(),
  duration: z.number(),
  stdout: z.string(),
  stderr: z.string(),
});

const qualitySuiteOutput = {
  lint: commandOutput.optional(),
  typecheck: commandOutput.optional(),
  frontendTests: commandOutput.optional(),
  functionsTests: commandOutput.optional(),
  rulesTests: commandOutput.optional(),
  summary: z.object({
    success: z.boolean(),
    failedStep: z
      .enum([
        'lint',
        'typecheck',
        'frontendTests',
        'functionsTests',
        'rulesTests',
      ])
      .nullable(),
    durationMs: z.number(),
  }),
};

async function runCommand(command: string, args: string[]) {
  const startTime = Date.now();
  try {
    const { stdout, stderr } = await execa(command, args, { cwd: repoRoot });
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

export function registerQualitySuiteTools(server: McpServer) {
  server.registerTool(
    'quality-suite',
    {
      title: 'Run Quality Suite',
      description: 'Runs lint, typecheck, and tests for all packages.',
      inputSchema: qualitySuiteInput,
      outputSchema: qualitySuiteOutput,
    },
    async () => {
      const start = Date.now();
      const output: any = {};

      // Run sequentially; stop on first failure
      const steps: Array<{ key: keyof typeof output; cmd: string[] }> = [
        { key: 'lint', cmd: ['lint'] },
        { key: 'typecheck', cmd: ['typecheck'] },
        { key: 'frontendTests', cmd: ['--filter', 'frontend', 'test'] },
        { key: 'functionsTests', cmd: ['--filter', 'functions', 'test'] },
        { key: 'rulesTests', cmd: ['test:rules'] },
      ];

      let failedStep: string | null = null;
      for (const step of steps) {
        const result = await runCommand('pnpm', step.cmd);
        output[step.key] = result;
        if (!result.pass) {
          failedStep = String(step.key);
          break;
        }
      }

      output.summary = {
        success: failedStep === null,
        failedStep: (failedStep as any) ?? null,
        durationMs: Date.now() - start,
      };

      return {
        content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
        structuredContent: output,
      };
    }
  );
}
