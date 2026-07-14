#!/usr/bin/env node
//
// `vite build`, with NODE_ENV pinned to production.
//
// THE TRAP THIS EXISTS TO CLOSE
//
// Vite reads NODE_ENV out of .env. Our .env carries `NODE_ENV=development` — correctly,
// for the Fastify server, which is started with `node --env-file=.env` and uses it to
// decide whether to return real error messages.
//
// But Vite reads the same file, and NODE_ENV=development in it makes `vite build` emit a
// DEVELOPMENT bundle:
//
//   • the React dev JSX runtime (jsxDEV), thousands of calls
//   • absolute source paths from the build machine, baked into the shipped JS
//     ("/home/deck/Downloads/Scholomance-V12-main/src/...")
//   • import.meta.env.DEV === true and import.meta.env.PROD === false IN PRODUCTION,
//     which silently inverts every dev-only guard in the codebase — the dev-only routes
//     in main.jsx, AdminRoute's IS_PROD, the panels gated in ReadPage/ToolsSidebar
//
// That last one is the dangerous part: the guards look right, review clean, and do
// nothing. This matters because scripts/deploy.sh uploads the LOCAL ./dist to Cloudflare
// Pages — the bundle built on a developer's machine, with that developer's .env, is the
// bundle production serves. (Docker and CI are unaffected: .dockerignore excludes .env.)
//
// A shell NODE_ENV wins over the .env one, so setting it here is the fix, and it holds
// no matter what any .env says. Measured: 6536 jsxDEV calls before, 0 after.

import { spawn } from 'node:child_process';

const child = spawn('vite', ['build', ...process.argv.slice(2)], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: { ...process.env, NODE_ENV: 'production' },
});

child.on('exit', (code, signal) => {
  if (signal) {
    console.error(`[build] vite terminated by ${signal}.`);
    process.exit(1);
  }
  process.exit(code ?? 1);
});
