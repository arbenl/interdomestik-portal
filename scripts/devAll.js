#!/usr/bin/env node
/*
  Dev orchestrator: runs Functions emulators and Vite dev together, and
  shuts both down on Ctrl-C. Replaces the background (&) approach so that
  stopping one stops the other.
*/
const { spawn } = require('child_process');

function run(cmd, args, opts = {}) {
  const p = spawn(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32', ...opts });
  p.on('exit', (code, signal) => {
    // bubble for optional logging
  });
  return p;
}

let killed = false;
function safeKill(p, name) {
  if (!p || p.killed) return;
  try { p.kill('SIGINT'); } catch {}
  setTimeout(() => { try { p.kill('SIGTERM'); } catch {} }, 1500);
  setTimeout(() => { try { p.kill('SIGKILL'); } catch {} }, 4000);
}

// Start Functions (emulators) first so Hosting/Functions/Firestore are ready.
const fn = run('npm', ['--prefix', 'functions', 'run', 'serve']);

// Then start Vite dev (frontend)
const fe = run('npm', ['--prefix', 'frontend', 'run', 'dev']);

function shutdown() {
  if (killed) return; killed = true;
  console.log('\nShutting down dev processes...');
  safeKill(fe, 'frontend');
  safeKill(fn, 'functions');
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('exit', shutdown);

