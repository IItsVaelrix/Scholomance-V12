#!/usr/bin/env node
// ONE command to run the entire Scholomance combat stack end to end:
//
//   game  (Fastify + Vite, `npm run dev`)
//     │  player casts verses in the web app
//     ▼
//   relay (ws://127.0.0.1:3001, `npm run dev:relay`)
//     │  bridges combat packets web → Godot
//     ▼
//   godot (CombatPage renderer, `npm run godot:combat`)
//
// Ctrl+C tears the whole process tree down. Closing the Godot window or the
// relay just logs it (relaunch by re-running) — only the game dying is fatal.

import { spawn } from 'node:child_process';
import { connect } from 'node:net';

const RELAY_PORT = 3001;
const children = [];
let shuttingDown = false;

// Resolves true if something is already listening on the port (e.g. a relay
// left running from an earlier `npm run dev:relay`). Mirrors how `npm run dev`
// reuses an existing Fastify server instead of crashing on EADDRINUSE.
function isPortOpen(port) {
  return new Promise((resolve) => {
    const socket = connect({ host: '127.0.0.1', port });
    const done = (open) => { socket.destroy(); resolve(open); };
    socket.setTimeout(800);
    socket.once('connect', () => done(true));
    socket.once('timeout', () => done(false));
    socket.once('error', () => done(false));
  });
}

const COLORS = { reset: '\x1b[0m', game: '\x1b[36m', relay: '\x1b[35m', godot: '\x1b[33m' };

function run(name, scriptArgs, { delay = 0, fatal = false } = {}) {
  setTimeout(() => {
    if (shuttingDown) return;

    const child = spawn('npm', ['run', ...scriptArgs], {
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: true, // own process group so we can kill the whole subtree
      env: process.env,
    });
    child._label = name;
    children.push(child);

    const prefix = `${COLORS[name] || ''}[${name}]${COLORS.reset} `;
    const pipe = (stream, out) => {
      let buf = '';
      stream.on('data', (chunk) => {
        buf += chunk.toString();
        const lines = buf.split('\n');
        buf = lines.pop();
        for (const line of lines) out.write(prefix + line + '\n');
      });
    };
    pipe(child.stdout, process.stdout);
    pipe(child.stderr, process.stderr);

    child.on('exit', (code, signal) => {
      process.stdout.write(`${prefix}exited (code=${code ?? 'null'}, signal=${signal ?? 'none'})\n`);
      if (shuttingDown) return;
      if (fatal) {
        console.log(`\n[combat:all] "${name}" is required — shutting everything down.`);
        shutdown(1);
      }
    });
  }, delay);
}

function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log('\n[combat:all] stopping the combat stack…');
  for (const child of children) {
    try { process.kill(-child.pid, 'SIGTERM'); } catch { /* already gone */ }
  }
  setTimeout(() => {
    for (const child of children) {
      try { process.kill(-child.pid, 'SIGKILL'); } catch { /* already gone */ }
    }
    process.exit(exitCode);
  }, 3000).unref();
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

async function main() {
  console.log('[combat:all] launching game + relay + Godot — press Ctrl+C to stop everything.\n');

  run('game', ['dev'], { fatal: true }); // Fastify + Vite (the actual game)

  if (await isPortOpen(RELAY_PORT)) {
    console.log(`[combat:all] reusing existing relay already listening on ws://127.0.0.1:${RELAY_PORT}.`);
  } else {
    run('relay', ['dev:relay']); // ws://127.0.0.1:3001 bridge
  }

  run('godot', ['godot:combat'], { delay: 2500 }); // renderer, after the relay binds :3001
}

main();
