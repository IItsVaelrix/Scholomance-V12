#!/usr/bin/env node
/**
 * External harness for render.paint.overdraw — compiler never runs this.
 *
 * Collects the three required observations on /listen, writes receipts, seals
 * a Probe report. Usage:
 *
 *   npx tsx bench/semantic-calculus/observe-paint-overdraw.mjs
 *   PW_BASE_URL=http://127.0.0.1:4173 npx tsx bench/semantic-calculus/observe-paint-overdraw.mjs
 */

import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { compileProbeReport } from '../../codex/core/semantic-calculus/compiler.ts';
import { makeReceipt } from '../../codex/core/semantic-calculus/observationReceipt.ts';
import { emptyContext } from '../../codex/core/semantic-calculus/trustPartition.ts';
import { evaluateHypotheses } from '../../codex/core/semantic-calculus/hypothesisStatus.ts';
import { getProbe } from '../../codex/core/semantic-calculus/probeRegistry.ts';
import { createHash } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../..');
const OUT_DIR = join(__dirname, 'corpus/paint-overdraw');
const PROBE_ID = 'render.paint.overdraw';
const ROUTE = '/listen';
const SAMPLE_MS = Number(process.env.PAINT_SAMPLE_MS || 3000);
const PORT = Number(process.env.PW_VISUAL_PORT || 4173);
const BASE = process.env.PW_BASE_URL || `http://127.0.0.1:${PORT}`;

function envHash(extra = {}) {
  return createHash('sha256')
    .update(JSON.stringify({ base: BASE, route: ROUTE, sampleMs: SAMPLE_MS, ...extra }))
    .digest('hex')
    .toUpperCase();
}

async function waitForUrl(url, timeoutMs = 90_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(1500) });
      if (res.ok || res.status === 304) return;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function ensureServer() {
  try {
    const res = await fetch(BASE, { signal: AbortSignal.timeout(1500) });
    if (res.ok || res.status === 304) return { child: null, reused: true };
  } catch {
    /* start */
  }
  const child = spawn(
    'npx',
    ['vite', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'],
    { cwd: ROOT, stdio: 'pipe', shell: process.platform === 'win32' },
  );
  await waitForUrl(BASE);
  return { child, reused: false };
}

/**
 * Instrument the page, sit idle, return the three observation result payloads.
 */
async function collectOnPage(page) {
  await page.addInitScript(() => {
    const g = globalThis;
    if (g.__scPaintProbe) return;
    const state = {
      rafRegistrations: 0,
      rafFires: 0,
      activeIds: new Set(),
      peakActive: 0,
      animSamples: [],
      paintMarks: 0,
      startedAt: 0,
    };
    const origRAF = g.requestAnimationFrame.bind(g);
    const origCAF = g.cancelAnimationFrame?.bind(g);
    g.requestAnimationFrame = (cb) => {
      state.rafRegistrations += 1;
      const id = origRAF((t) => {
        state.activeIds.delete(id);
        state.rafFires += 1;
        return cb(t);
      });
      state.activeIds.add(id);
      if (state.activeIds.size > state.peakActive) state.peakActive = state.activeIds.size;
      return id;
    };
    if (origCAF) {
      g.cancelAnimationFrame = (id) => {
        state.activeIds.delete(id);
        return origCAF(id);
      };
    }
    try {
      const po = new PerformanceObserver((list) => {
        for (const e of list.getEntries()) {
          if (e.entryType === 'paint' || e.entryType === 'long-animation-frame') {
            state.paintMarks += 1;
          }
        }
      });
      po.observe({ type: 'paint', buffered: true });
      try {
        po.observe({ type: 'long-animation-frame', buffered: true });
      } catch {
        /* not all engines */
      }
    } catch {
      /* PerformanceObserver unavailable */
    }
    g.__scPaintProbe = state;
    g.__scPaintProbeSampleAnims = () => {
      const anims = typeof document.getAnimations === 'function' ? document.getAnimations({ subtree: true }) : [];
      state.animSamples.push({
        t: performance.now(),
        count: anims.length,
        playing: anims.filter((a) => a.playState === 'running').length,
      });
    };
  });

  await page.goto(`${BASE}${ROUTE}`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  // Let Phaser / Framer mount.
  await page.waitForTimeout(2000);
  // Prefer Phaser's own loop FPS when available — more honest than wrapped rAF
  // under headless timer quirks.
  await page.waitForFunction(
    () => document.querySelectorAll('canvas').length >= 1,
    { timeout: 30_000 },
  ).catch(() => {});

  await page.evaluate(() => {
    const s = globalThis.__scPaintProbe;
    if (s) {
      s.rafRegistrations = 0;
      s.rafFires = 0;
      s.peakActive = s.activeIds.size;
      s.animSamples = [];
      s.paintMarks = 0;
      s.startedAt = performance.now();
      s.phaserFpsSamples = [];
    }
  });

  const sampleEvery = 100;
  const samples = Math.max(5, Math.floor(SAMPLE_MS / sampleEvery));
  for (let i = 0; i < samples; i++) {
    await page.evaluate(() => {
      globalThis.__scPaintProbeSampleAnims?.();
      const s = globalThis.__scPaintProbe;
      if (!s) return;
      // Phaser 3 exposes game.loop.actualFps on live instances.
      const games = [];
      for (const c of document.querySelectorAll('canvas')) {
        const g = c.parentElement?.__phaserGame || c.__phaserGame;
        if (g?.loop?.actualFps != null) games.push(g.loop.actualFps);
      }
      // Shared Listen game may hang off a module global — also scan window keys.
      for (const key of Object.keys(globalThis)) {
        try {
          const v = globalThis[key];
          if (v && typeof v === 'object' && v.loop && typeof v.loop.actualFps === 'number') {
            games.push(v.loop.actualFps);
          }
        } catch {
          /* ignore */
        }
      }
      if (games.length) s.phaserFpsSamples.push(Math.max(...games));
    });
    await page.waitForTimeout(sampleEvery);
  }

  const raw = await page.evaluate(() => {
    const s = globalThis.__scPaintProbe;
    const elapsedMs = s ? Math.max(1, performance.now() - s.startedAt) : 1;
    const canvases = [...document.querySelectorAll('canvas')].map((c) => ({
      w: c.width,
      h: c.height,
      cssW: c.clientWidth,
      cssH: c.clientHeight,
    }));
    const animSamples = s?.animSamples ?? [];
    let spawns = 0;
    for (let i = 1; i < animSamples.length; i++) {
      const delta = animSamples[i].count - animSamples[i - 1].count;
      if (delta > 0) spawns += delta;
    }
    const elapsedSec = elapsedMs / 1000;
    const phaser = s?.phaserFpsSamples ?? [];
    const phaserFpsAvg = phaser.length
      ? phaser.reduce((a, b) => a + b, 0) / phaser.length
      : null;
    // Prefer Phaser-reported FPS as idle paint/presentation rate; fall back to
    // instrumented rAF fires (often throttled in headless).
    const paintsPerSecondIdle =
      phaserFpsAvg != null && phaserFpsAvg > 0 ? phaserFpsAvg : s ? s.rafFires / elapsedSec : 0;
    return {
      elapsedMs,
      elapsedSec,
      paintsPerSecondIdle,
      paintSource: phaserFpsAvg != null && phaserFpsAvg > 0 ? 'phaser.loop.actualFps' : 'raf.fires',
      phaserFpsAvg,
      phaserFpsSamples: phaser.length,
      paintMarks: s?.paintMarks ?? 0,
      rafRegistrations: s?.rafRegistrations ?? 0,
      rafFires: s?.rafFires ?? 0,
      activeCallbackCount: s?.activeIds.size ?? 0,
      peakActiveCallbacks: s?.peakActive ?? 0,
      registrationsPerSecond: s ? s.rafRegistrations / elapsedSec : 0,
      spawnsPerSecondIdle: spawns / elapsedSec,
      animSampleCount: animSamples.length,
      animCounts: animSamples.map((a) => a.count),
      canvasCount: canvases.length,
      canvases,
      visibilityState: document.visibilityState,
      path: location.pathname,
    };
  });

  return raw;
}

function buildReceipts(raw) {
  const environmentHash = envHash({ path: raw.path });
  const paintResult = {
    paintsPerSecondIdle: Number(raw.paintsPerSecondIdle.toFixed(2)),
    paintSource: raw.paintSource ?? 'raf.fires',
    paintMarks: raw.paintMarks,
    canvasCount: raw.canvasCount,
    elapsedSec: Number(raw.elapsedSec.toFixed(3)),
    note:
      'Idle paint rate prefers Phaser loop FPS when visible; else instrumented rAF fire rate (headless may throttle).',
  };
  const rafResult = {
    activeCallbackCount: raw.activeCallbackCount,
    peakActiveCallbacks: raw.peakActiveCallbacks,
    rafRegistrations: raw.rafRegistrations,
    rafFires: raw.rafFires,
    registrationsPerSecond: Number(raw.registrationsPerSecond.toFixed(2)),
    elapsedSec: Number(raw.elapsedSec.toFixed(3)),
  };
  const animResult = {
    spawnsPerSecondIdle: Number(raw.spawnsPerSecondIdle.toFixed(2)),
    animCounts: raw.animCounts,
    canvasCount: raw.canvasCount,
    elapsedSec: Number(raw.elapsedSec.toFixed(3)),
  };

  return [
    makeReceipt({
      probeId: PROBE_ID,
      observationId: 'obs.paint.rect_rate',
      environmentHash,
      result: paintResult,
      status: 'observed',
    }),
    makeReceipt({
      probeId: PROBE_ID,
      observationId: 'obs.raf.callback_inventory',
      environmentHash,
      result: rafResult,
      status: 'observed',
    }),
    makeReceipt({
      probeId: PROBE_ID,
      observationId: 'obs.anim.instance_spawn',
      environmentHash,
      result: animResult,
      status: 'observed',
    }),
  ];
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const { child, reused } = await ensureServer();
  console.log(`server ${reused ? 'reused' : 'started'} at ${BASE}`);

  // Headless throttles background timers (~5 rAF/s). Disable that or paint
  // rates lie and h_overpaint / h_not_paint both get stuck in the dead zone.
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
    ],
  });
  const page = await browser.newPage();
  const client = await page.context().newCDPSession(page);
  await client.send('Emulation.setFocusEmulationEnabled', { enabled: true });
  let raw;
  try {
    raw = await collectOnPage(page);
  } finally {
    await browser.close();
    if (child) {
      child.kill('SIGTERM');
    }
  }

  const receipts = buildReceipts(raw);
  const probe = getProbe(PROBE_ID);
  const evaluation = evaluateHypotheses(probe.hypotheses, receipts, { allowExclusive: true });
  const { act } = compileProbeReport({
    utterance: 'why excessive painting',
    context: emptyContext(),
    probeId: PROBE_ID,
    receipts,
  });

  const bundle = {
    collectedAt: new Date().toISOString(),
    base: BASE,
    route: ROUTE,
    sampleMs: SAMPLE_MS,
    raw,
    receipts,
    evaluation,
    report: {
      kind: act.kind,
      phase: act.phase,
      epistemic: act.epistemic,
      payload: act.payload,
      seal: act.seal,
    },
  };

  const outPath = join(OUT_DIR, `receipts-${Date.now()}.json`);
  writeFileSync(outPath, JSON.stringify(bundle, null, 2));
  writeFileSync(join(OUT_DIR, 'latest.json'), JSON.stringify(bundle, null, 2));

  const C = { d: '\x1b[2m', b: '\x1b[1m', r: '\x1b[0m', g: '\x1b[32m', y: '\x1b[33m', c: '\x1b[36m', m: '\x1b[35m', red: '\x1b[31m' };
  console.log('');
  console.log(`${C.c}${C.b}Probe report${C.r}  ${PROBE_ID}  phase=${act.phase}`);
  console.log(`${C.d}epistemic.gap=${act.epistemic.gap}  warrant present=${act.epistemic.warrantPresent.join(',')}${C.r}`);
  console.log('');
  console.log(`${C.b}observations${C.r}`);
  console.log(`  paintsPerSecondIdle     ${raw.paintsPerSecondIdle.toFixed(1)}  (${raw.paintSource ?? 'raf.fires'})`);
  console.log(`  activeCallbackCount     ${raw.activeCallbackCount} (peak ${raw.peakActiveCallbacks})`);
  console.log(`  spawnsPerSecondIdle     ${raw.spawnsPerSecondIdle.toFixed(2)}`);
  console.log(`  canvases                ${raw.canvasCount}`);
  console.log(`  visibility              ${raw.visibilityState ?? '?'}`);
  console.log('');
  console.log(`${C.b}hypotheses${C.r}`);
  console.log(`  ${C.g}supported${C.r}        ${evaluation.supported.join(', ') || '—'}`);
  console.log(`  ${C.y}surviving${C.r}        ${evaluation.surviving.join(', ') || '—'}`);
  console.log(`  ${C.red}eliminated${C.r}       ${evaluation.eliminated.join(', ') || '—'}`);
  console.log(`  ${C.m}underdetermined${C.r}  ${evaluation.underdetermined.join(', ') || '—'}`);
  console.log(`  exclusive       ${evaluation.exclusive.join(', ') || '—'}`);
  console.log('');
  console.log(`${C.d}wrote ${outPath}${C.r}`);
  console.log(`${C.d}seal ${act.seal.digest.slice(0, 16)}…${C.r}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
