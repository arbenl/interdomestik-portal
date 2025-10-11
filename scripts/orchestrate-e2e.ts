import { execa } from 'execa';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = resolve(__dirname, '..');

async function runMcpCommand(tool: string, args: Record<string, unknown> = {}) {
  const command = ['tsx', 'scripts/mcp-client.ts', tool, JSON.stringify(args)];
  console.log(`
> Running: ${command.join(' ')}
`);
  return execa('pnpm', command, {
    cwd: repoRoot,
    stdio: 'inherit',
    reject: false,
  });
}

async function main() {
  let exitCode = 0;
  try {
    // 1. Stop any running emulators
    await runMcpCommand('stop-emulators');

    // 2. Build functions
    console.log('\n> Building functions...');
    await execa('pnpm', ['-F', 'functions', 'build'], {
      cwd: repoRoot,
      stdio: 'inherit',
    });

    // 3. Start emulators in seeded mode
    const startResult = await runMcpCommand('start-emulators', {
      mode: 'seeded',
    });
    if (startResult.exitCode !== 0) {
      throw new Error('Failed to start emulators');
    }

    // 4. Run E2E tests
    const testResult = await runMcpCommand('run-test-command', {
      name: 'frontend:e2e',
    });
    if (testResult.exitCode !== 0) {
      console.error('E2E tests failed');
      exitCode = 1;
    }
  } catch (error) {
    console.error('Orchestration failed', error);
    exitCode = 1;
  } finally {
    // 5. Stop emulators
    await runMcpCommand('stop-emulators');
    process.exit(exitCode);
  }
}

main();
