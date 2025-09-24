import * as net from 'node:net';
import * as fs from 'node:fs/promises';
import { spawn } from 'node:child_process';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || 'interdomestik-dev';

interface EmulatorConfig {
  host: string;
  port: number;
}

interface FirebaseConfig {
  emulators: Record<string, EmulatorConfig>;
}

/**
 * Checks if a TCP port is open and reachable.
 */
function isReachable(port: number, host: string): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const onError = () => {
      socket.destroy();
      resolve(false);
    };
    socket.setTimeout(400);
    socket.once('error', onError);
    socket.once('timeout', onError);
    socket.connect(port, host, () => {
      socket.end();
      resolve(true);
    });
  });
}

/**
 * Finds the next available TCP port starting from a given port.
 */
async function findFreePort(startPort: number): Promise<number> {
  let port = startPort;
  while (port < startPort + 50) {
    if (!(await isReachable(port, '127.0.0.1'))) {
      return port;
    }
    port++;
  }
  throw new Error(`Could not find a free port starting from ${startPort}`);
}

/**
 * Reads the firebase.json configuration file.
 */
async function readFirebaseConfig(): Promise<FirebaseConfig> {
  try {
    const content = await fs.readFile(path.resolve(__dirname, '../../../firebase.json'), 'utf-8');
    return JSON.parse(content) as FirebaseConfig;
  } catch {
    console.warn('⚠️ Could not read firebase.json, using default emulator ports.');
    return {
      emulators: {
        auth: { host: '127.0.0.1', port: 9099 },
        firestore: { host: '127.0.0.1', port: 8080 },
      },
    };
  }
}

/**
 * Spawns a child process.
 */
function runCommand(command: string, args: string[], options: import('child_process').SpawnOptions = {}) {
  const child = spawn(command, args, { stdio: 'inherit', ...options });
  child.on('close', (code) => {
    if (code !== 0) {
      // Exit if the command itself fails, but not for detached processes.
      if (!options.detached) process.exit(code ?? 1);
    }
  });
  child.on('error', (err) => {
    console.error(`Failed to start subprocess: ${command}`, err);
    process.exit(1);
  });
  return child;
}

async function main() {
  const baseConfig = await readFirebaseConfig();
  const authConfig = baseConfig.emulators.auth;
  const firestoreConfig = baseConfig.emulators.firestore;

  const authReachable = await isReachable(authConfig.port, authConfig.host);
  const firestoreReachable = await isReachable(firestoreConfig.port, firestoreConfig.host);

  if (authReachable && firestoreReachable) {
    console.log('ℹ️ Emulators detected on configured ports: seeding directly.');
    runCommand('pnpm', ['seed:raw'], { env: { ...process.env, FIREBASE_PROJECT_ID: PROJECT_ID } });
  } else {
    console.log('ℹ️ Emulators not detected. Starting them in the background...');
    
    const emuProcess = runCommand('firebase', ['emulators:start', '--project', PROJECT_ID], { detached: true });
    emuProcess.unref(); // Allow parent process to exit independently

    console.log('   Waiting for emulators to initialize (10s)...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    console.log('   Running seed script...');
    runCommand('pnpm', ['seed:raw'], { env: { ...process.env, FIREBASE_PROJECT_ID: PROJECT_ID } });
  }
}

void main();
