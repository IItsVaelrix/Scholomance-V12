#!/usr/bin/env node
/**
 * Cleri Probe baseline harness.
 *
 * Read-only instrumentation around the current CLI engine (scripts/cleri-probe.js).
 * Emits sorted JSON with file count, query duration, prion duration, top paths,
 * and the ranking of the listener-lifecycle accuracy fixtures. It records today's
 * measurable profile without asserting future gates.
 */

import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.resolve(__dirname, '../cleri-probe.js');
const CLI_RELATIVE_PATH = 'scripts/cleri-probe.js';
const LISTENER_FIXTURE_PREFIX = 'tests/qa/fixtures/cleri-probe/listener-lifecycle/';

function runCli(args) {
  return new Promise((resolve, reject) => {
    const start = performance.now();
    const child = spawn(process.execPath, [CLI, ...args], {
      cwd: process.cwd(),
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => { stderr += chunk; });

    child.on('error', reject);
    child.on('close', code => {
      const elapsedMs = performance.now() - start;
      resolve({ code, stdout, stderr, elapsedMs });
    });
  });
}

function parseScannedFiles(output) {
  const match = output.match(/\[probe\] substrate: (\d+) files/);
  return match ? parseInt(match[1], 10) : null;
}

function parseHeatmap(output) {
  const lines = output.split('\n');
  const heatmap = [];
  let inHeatmap = false;

  for (const line of lines) {
    if (line.includes('GENETIC HEATMAP')) {
      inHeatmap = true;
      continue;
    }
    if (inHeatmap && line.startsWith('---')) continue;
    if (inHeatmap) {
      const match = line.match(/^\s*([\d.]+)%\s+.*\s+(\S.+)$/);
      if (match) {
        heatmap.push({
          resonance: parseFloat(match[1]) / 100,
          path: match[2].trim(),
        });
      }
      if (line.includes('ritual complete') || line.includes('more modules')) {
        inHeatmap = false;
      }
    }
  }

  return heatmap;
}

function rankListenerFixtures(heatmap) {
  const ranking = {};
  const fixtureNames = ['verified.jsx', 'hard-negative.jsx'];

  for (const name of fixtureNames) {
    const fullPath = LISTENER_FIXTURE_PREFIX + name;
    const rank = heatmap.findIndex(hit => hit.path === fullPath);
    ranking[name] = rank === -1 ? null : rank + 1;
  }

  return ranking;
}

function rankCliSelf(heatmap) {
  const rank = heatmap.findIndex(hit => hit.path === CLI_RELATIVE_PATH);
  return rank === -1 ? null : rank + 1;
}

function parsePrionFindings(output) {
  const findings = [];
  const lines = output.split('\n');
  let current = null;

  for (const line of lines) {
    const header = line.match(/^\s+(\S+)\s+\((\d+) sites\)\s*(\[exact\]|\[heuristic)/);
    if (header) {
      current = {
        name: header[1],
        siteCount: parseInt(header[2], 10),
        exact: header[3] === '[exact]',
        hits: [],
      };
      findings.push(current);
      continue;
    }
    if (current && line.match(/^\s+\S/)) {
      const hit = line.match(/^\s+(\S.+?:\d+)(?:\s+key="([^"]+)")?/);
      if (hit) {
        current.hits.push({ location: hit[1].trim(), key: hit[2] || null });
      }
    }
  }

  return findings;
}

async function main() {
  const emitJson = process.argv.includes('--json');

  const hypothesis = 'leaked event listener subscription missing cleanup';
  // Lower the resonance floor so the labeled accuracy fixtures appear in the
  // heatmap and we can record their relative ranking. The engine itself is
  // unchanged; only this baseline harness asks it to surface more results.
  const processRun = await runCli([hypothesis, '--min-resonance=0.15', '--limit=500']);
  const scannedFiles = parseScannedFiles(processRun.stdout);
  const heatmap = parseHeatmap(processRun.stdout);
  const listenerFixtureRanking = rankListenerFixtures(heatmap);
  const cliSelfRanking = rankCliSelf(heatmap);

  const prionRun = await runCli(['--mode=prion']);
  const prionFindings = parsePrionFindings(prionRun.stdout);

  const report = {
    capturedAt: new Date().toISOString(),
    cliPath: CLI,
    hypothesis,
    scannedFiles,
    currentProcessMs: Math.round(processRun.elapsedMs * 100) / 100,
    currentPrionMs: Math.round(prionRun.elapsedMs * 100) / 100,
    listenerFixtureRanking,
    cliSelfRanking,
    topPaths: heatmap.slice(0, 20).map(hit => ({
      path: hit.path,
      resonance: hit.resonance,
    })),
    prionFindingsSummary: prionFindings.map(f => ({
      name: f.name,
      siteCount: f.siteCount,
      exact: f.exact,
      topHits: f.hits.slice(0, 5).map(h => h.location),
    })),
  };

  if (emitJson) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log('Cleri Probe baseline report');
    console.log('===========================');
    console.log(`Scanned files : ${scannedFiles}`);
    console.log(`Hypothesis ms : ${report.currentProcessMs}`);
    console.log(`Prion ms      : ${report.currentPrionMs}`);
    console.log('Listener fixture ranking:', listenerFixtureRanking);
    console.log('CLI self-ranking:', cliSelfRanking);
    console.log('\nTop paths:');
    for (const hit of report.topPaths) {
      console.log(`  ${(hit.resonance * 100).toFixed(1)}%  ${hit.path}`);
    }
    console.log('\nPrion findings:');
    for (const f of report.prionFindingsSummary) {
      console.log(`  ${f.name} (${f.siteCount} sites) ${f.exact ? '[exact]' : '[heuristic]'}`);
      for (const loc of f.topHits) {
        console.log(`    ${loc}`);
      }
    }
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
