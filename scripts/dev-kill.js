#!/usr/bin/env node
//
// Reap every process `npm run dev` leaves behind.
//
// `dev` starts a tree — dev-with-collab-reuse -> (npm run dev:server -> Fastify) + vite —
// and a hard exit, a crashed shell or a killed terminal orphans the leaves. They keep the
// ports. The next `npm run dev` then "reuses" a server running LAST HOUR'S code, or Vite
// silently moves to 5174 and the app talks to a stale origin.
//
// Scoped to THIS repo: a process is only a candidate if its cwd (or its command line) is
// inside the repo root, so a Vite dev server for some other project is never touched.

import { execFileSync } from 'node:child_process';
import { readlinkSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Every port the dev stack binds. A stray holding one of these is a candidate even if its
// command line has drifted from the patterns below.
const DEV_PORTS = [5173, 8080];

// The dev tree proper. These die by default.
const DEV_PATTERNS = [
  /scripts\/dev-with-collab-reuse\.js/,
  /codex\/server\/index\.js/,
  /\bvite\b/,
  /npm(?: exec| run)\s+(?:dev|dev:server|dev:relay|vite)/,
  /scripts\/combat-relay\.js/,
  /serve_scholomance_dict\.py/,
];

// MCP bridges are NOT children of `npm run dev` — an editor (Claude Code, Cursor) spawns
// them over stdio, and killing one severs the MCP tools of a live session. Off by default;
// --all includes them, for when a stale bridge is serving pre-edit code.
const BRIDGE_PATTERNS = [
  /codex\/server\/collab\/mcp-bridge-entry\.js/,
  /scripts\/collab-daemon\.js/,
];

const argv = new Set(process.argv.slice(2));
const includeBridges = argv.has('--all') || argv.has('--bridges');
const dryRun = argv.has('--dry-run') || argv.has('-n');

// Never reap ourselves, or the npm/shell that is running us.
const SELF = new Set();
for (let pid = process.pid, hops = 0; pid > 1 && hops < 8; hops += 1) {
  SELF.add(pid);
  pid = parentOf(pid);
}

function parentOf(pid) {
  try {
    const stat = execFileSync('ps', ['-o', 'ppid=', '-p', String(pid)], { encoding: 'utf8' });
    return Number(stat.trim()) || 0;
  } catch {
    return 0;
  }
}

function cwdOf(pid) {
  try {
    return readlinkSync(`/proc/${pid}/cwd`); // Linux; absent on macOS, where we fall back to argv.
  } catch {
    return null;
  }
}

function listProcesses() {
  const out = execFileSync('ps', ['-eo', 'pid=,args='], { encoding: 'utf8' });
  return out
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [, pid, args] = line.match(/^(\d+)\s+(.*)$/) ?? [];
      return pid ? { pid: Number(pid), args } : null;
    })
    .filter(Boolean);
}

function portHolders() {
  const byPid = new Map(); // pid -> port
  for (const port of DEV_PORTS) {
    let out = '';
    try {
      out = execFileSync('ss', ['-lptnH', `sport = :${port}`], { encoding: 'utf8' });
    } catch {
      continue; // no ss, or nothing listening
    }
    for (const match of out.matchAll(/pid=(\d+)/g)) {
      byPid.set(Number(match[1]), port);
    }
  }
  return byPid;
}

// A process belongs to this repo if it RUNS from here (cwd) or NAMES this path in argv.
// Without one of those, a match on /\bvite\b/ is somebody else's dev server.
function belongsToRepo(proc) {
  const cwd = cwdOf(proc.pid);
  if (cwd) return cwd === REPO_ROOT || cwd.startsWith(`${REPO_ROOT}${path.sep}`);
  return proc.args.includes(REPO_ROOT);
}

function classify(proc, listening) {
  if (SELF.has(proc.pid)) return null;

  const holdsPort = listening.has(proc.pid);
  const isBridge = BRIDGE_PATTERNS.some((re) => re.test(proc.args));
  const isDev = DEV_PATTERNS.some((re) => re.test(proc.args));

  if (!isBridge && !isDev && !holdsPort) return null;
  if (!belongsToRepo(proc)) return null;

  return isBridge ? 'bridge' : 'dev';
}

function signal(pid, sig) {
  try {
    process.kill(pid, sig);
    return true;
  } catch (error) {
    return error.code === 'ESRCH'; // already gone counts as dead
  }
}

const alive = (pid) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code === 'EPERM';
  }
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const holders = portHolders();
const found = listProcesses()
  .map((proc) => ({ ...proc, kind: classify(proc, holders), port: holders.get(proc.pid) }))
  .filter((proc) => proc.kind);

const targets = found.filter((proc) => proc.kind === 'dev' || includeBridges);
const spared = found.filter((proc) => !targets.includes(proc));

if (targets.length === 0) {
  console.log('[dev:kill] No dev processes running for this repo. Nothing to reap.');
} else {
  for (const proc of targets) {
    const where = proc.port ? ` :${proc.port}` : '';
    console.log(`[dev:kill] ${dryRun ? 'would kill' : 'killing'} ${proc.pid}${where}  ${proc.args.slice(0, 90)}`);
  }

  if (!dryRun) {
    // Ask first. Vite and Fastify both flush and unlink their sockets on SIGTERM.
    targets.forEach((proc) => signal(proc.pid, 'SIGTERM'));

    let survivors = [];
    for (let attempt = 0; attempt < 20; attempt += 1) {
      await sleep(100);
      survivors = targets.filter((proc) => alive(proc.pid));
      if (survivors.length === 0) break;
    }

    // Then insist.
    if (survivors.length > 0) {
      for (const proc of survivors) {
        console.log(`[dev:kill] ${proc.pid} ignored SIGTERM; sending SIGKILL.`);
        signal(proc.pid, 'SIGKILL');
      }
      await sleep(200);
    }

    const undead = targets.filter((proc) => alive(proc.pid));
    if (undead.length > 0) {
      console.error(`[dev:kill] Could not kill: ${undead.map((proc) => proc.pid).join(', ')}`);
      process.exit(1);
    }

    console.log(`[dev:kill] Reaped ${targets.length} process${targets.length === 1 ? '' : 'es'}.`);
  }
}

for (const proc of spared) {
  console.log(`[dev:kill] left alone (MCP bridge, --all to include): ${proc.pid}  ${proc.args.slice(0, 70)}`);
}

// The point of the exercise: the ports are free.
const stillHeld = portHolders();
const leaked = DEV_PORTS.filter((port) => [...stillHeld.values()].includes(port));
if (!dryRun && leaked.length > 0) {
  console.warn(`[dev:kill] Still bound by a process outside this repo: ${leaked.join(', ')}`);
}
