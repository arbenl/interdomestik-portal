import { execa } from 'execa';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';

const repoRoot = resolve(process.cwd());

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

    // 3a. Wait until emulators are ready before hitting Playwright webServer hooks
    const waitResult = await runMcpCommand('wait-for-emulators', {
      ports: [5000, 5001, 8080, 9099],
      timeoutMs: 120_000,
    });
    if (waitResult.exitCode !== 0) {
      throw new Error('Emulators did not become ready in time');
    }

    // 4. Run E2E tests
    const testResult = await runMcpCommand('run-test-command', {
      name: 'frontend:e2e',
    });
    if (testResult.exitCode !== 0) {
      console.error('E2E tests failed');
      exitCode = 1;
    }

    // 4a. Print artifact paths if present
    const artifacts = [
      'frontend/test-results',
      'frontend/playwright-report',
    ].filter((p) => existsSync(resolve(repoRoot, p)));
    if (artifacts.length) {
      console.log('\nArtifacts available:');
      for (const p of artifacts) console.log(` - ${p}`);
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
