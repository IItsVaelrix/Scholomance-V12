import { spawn } from 'node:child_process';

const host = process.env.HOST || '0.0.0.0';
const port = Number(process.env.PORT || 8080);
const healthBase = `http://localhost:${port}`;

let serverProcess = null;
let viteProcess = null;
let isShuttingDown = false;

function spawnChild(command, args, options = {}) {
  const child = spawn(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    ...options,
  });

  return child;
}

async function probe(path) {
  try {
    const response = await fetch(`${healthBase}${path}`, { signal: AbortSignal.timeout(1000) });
    return {
      ok: response.ok,
      status: response.status,
      body: await response.text(),
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      body: error instanceof Error ? error.message : String(error),
    };
  }
}

async function waitForServerReady(timeoutMs = 15000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const ready = await probe('/health/ready');
    if (ready.ok) return true;

    const live = await probe('/health/live');
    if (live.ok) return true;

    await new Promise((resolve) => setTimeout(resolve, 350));
  }

  return false;
}

async function ensureServer() {
  const ready = await probe('/health/ready');
  if (ready.ok) {
    console.log(`[dev] Reusing existing Fastify server at ${healthBase}; collab readiness confirmed.`);
    return;
  }

  const live = await probe('/health/live');
  if (live.ok) {
    console.log(`[dev] Reusing existing Fastify server at ${healthBase}; liveness confirmed, readiness still warming.`);
    return;
  }

  console.log(`[dev] Starting Fastify server on ${host}:${port}.`);
  serverProcess = spawnChild('npm', ['run', 'dev:server']);

  serverProcess.on('exit', (code, signal) => {
    if (isShuttingDown) return;
    console.error(`[dev] Fastify server exited unexpectedly (code=${code ?? 'null'}, signal=${signal ?? 'none'}).`);
    if (viteProcess) viteProcess.kill('SIGTERM');
    process.exit(code || 1);
  });

  const readyAfterStart = await waitForServerReady();
  if (!readyAfterStart) {
    console.warn(`[dev] Fastify did not report ready within the startup window; starting Vite anyway.`);
  }
}

function startVite() {
  viteProcess = spawnChild('vite', [], {
    env: {
      ...process.env,
      VITE_API_BASE_URL: process.env.VITE_API_BASE_URL || healthBase,
    },
  });

  viteProcess.on('exit', (code, signal) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    if (serverProcess) serverProcess.kill('SIGTERM');
    process.exit(code || (signal ? 1 : 0));
  });
}

function shutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  if (viteProcess) viteProcess.kill(signal);
  if (serverProcess) serverProcess.kill(signal);
}

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));

await ensureServer();
startVite();
