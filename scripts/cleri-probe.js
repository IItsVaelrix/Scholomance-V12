#!/usr/bin/env node
/**
 * PROACTIVE ANTIGEN PROBE CLI
 * 
 * Scans the codebase for "Theoretical Proteins" based on a bug hypothesis.
 * Usage: node scripts/cleri-probe.js "unseeded Math.random in combat logic"
 *        node scripts/cleri-probe.js --mode=prion
 *        node scripts/cleri-probe.js --mode=prion --min-resonance=0.75
 */

import fs from 'node:fs';
import path from 'node:path';
import { vectorizeHypothesis, scanSubstrate, buildIdfIndex } from '../codex/core/immunity/protein-probe.engine.js';
import { scanForPrion, scanForPairedCallPrion } from '../codex/core/immunity/prion-detector.engine.js';
import { PRION_LIBRARY, PAIRED_CALL_PRIONS } from '../codex/core/immunity/prion-library.js';

// The substrate is SOURCE CODE. Everything else is noise that raises the floor and
// buries the signal. Before this list was tightened the probe scanned a Python
// virtualenv (nlp_chatbot/ — 44,588 files) and a mirrored copy of the encyclopedia
// (steamdeck_brain/), and duly reported a PySide6 Qt metatypes JSON as the top hit
// for a JavaScript bug hypothesis.
const SKIP_DIRS = new Set([
  'node_modules', '.git', 'dist', '.codex', 'Archive', 'ARCHIVE REFERENCE DOCS',
  // vendored / foreign-language trees
  'nlp_chatbot', 'venv', '.venv', '__pycache__', 'site-packages',
  'target', 'pkg', 'godot_project', 'mudlet', 'OrChat',
  // mirrors and generated output (duplicate hits, no source of truth)
  'steamdeck_brain', 'generated-assets', 'dict_data', 'coverage',
  'playwright-report', 'test-results', '.superpowers', 'scratch',
  // prose, not code — a bug does not live in a design doc
  'docs',
]);

// Source only. A bug hypothesis cannot resonate with a metadata JSON or a markdown
// file, but those files DO dilute the IDF corpus and inflate the noise floor.
const SOURCE_FILE_RE = /\.(js|jsx|ts|tsx|mjs|cjs)$/;

// The PRION LIBRARY now lives in codex/core/immunity/prion-library.js and is scored
// by PRESENCE + ABSENCE, not cosine similarity. The old inline library expressed each
// prion as a bag-of-words hypothesis that LISTED THE MISSING TOKEN as a search term
// ("...silent swallow throw rethrow"). Cosine treats every token as evidence FOR a
// match, so it ranked healthy code above the bug — on a fixture it preferred a correct
// rethrow (42.4%) to a swallowed catch (0.1%). It hunted the cure and called it the
// disease. Deleted rather than ported: every hypothesis in it was inverted.

async function walk(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const res = path.join(dir, entry.name);
    const relPath = path.relative(process.cwd(), res);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) await walk(res, files);
    } else if (SOURCE_FILE_RE.test(entry.name)) {
      files.push({
        path: relPath,
        content: fs.readFileSync(res, 'utf8')
      });
    }
  }
  return files;
}

function parseArgs() {
  const args = process.argv.slice(2);
  console.log('[debug] raw args:', args);
  const result = {
    mode: 'hypothesis',
    hypothesis: '',
    minResonance: 0.4,
    limit: 15,
  };
  
  // Prion mode defaults to higher threshold to reduce noise
  if (args.some(a => a.startsWith('--mode=prion') || a === '--mode' || a === '-m')) {
    result.minResonance = 0.7;
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    console.log('[debug] parsing arg:', arg);
    
    // Handle --key=value format
    if (arg.startsWith('--mode=')) {
      result.mode = arg.split('=')[1] || 'hypothesis';
    } else if (arg.startsWith('--min-resonance=')) {
      result.minResonance = parseFloat(arg.split('=')[1]) || 0.4;
    } else if (arg.startsWith('--limit=')) {
      result.limit = parseInt(arg.split('=')[1], 10) || 15;
    } else if (arg === '--mode' || arg === '-m') {
      result.mode = args[++i] || 'hypothesis';
    } else if (arg === '--min-resonance' || arg === '-r') {
      result.minResonance = parseFloat(args[++i]) || 0.4;
    } else if (arg === '--limit' || arg === '-l') {
      result.limit = parseInt(args[++i], 10) || 15;
    } else if (!arg.startsWith('-')) {
      result.hypothesis += (result.hypothesis ? ' ' : '') + arg;
    }
  }

  console.log('[debug] parsed:', result);
  return result;
}

async function runHypothesisMode(hypothesis, substrate, minResonance, limit) {
  console.log(`[probe] vectorizing hypothesis: "${hypothesis}"...`);
  const idf = buildIdfIndex(substrate);
  const searchProtein = vectorizeHypothesis(hypothesis, { idf });
  console.log(`[probe] search protein fidelity: ${searchProtein.fidelity?.grade} (${searchProtein.fidelity?.score?.toFixed(4)})`);

  console.log('[probe] scanning substrate (codebase)...');
  const heatmap = scanSubstrate(substrate, searchProtein, { minResonance, idf });

  console.log('\n[probe] GENETIC HEATMAP — "Genes lighting up..."');
  console.log('--------------------------------------------------');

  if (heatmap.length === 0) {
    console.log('Zero resonance detected. The substrate is healthy for this protein.');
  } else {
    heatmap.slice(0, limit).forEach(hit => {
      const bar = '█'.repeat(Math.floor(hit.resonance * 20));
      const percentage = (hit.resonance * 100).toFixed(1);
      console.log(`${percentage.padStart(5)}% ${bar.padEnd(20)} ${hit.path}`);
    });
  }

  if (heatmap.length > limit) {
    console.log(`... and ${heatmap.length - limit} more modules.`);
  }

  return heatmap;
}

async function runPrionMode(substrate) {
  console.log('[probe] PRION SCAN — presence + ABSENCE, not similarity.');
  const total = Object.keys(PRION_LIBRARY).length + Object.keys(PAIRED_CALL_PRIONS).length;
  console.log(`[probe] ${total} prion archetypes loaded.\n`);

  const findings = [];

  // PAIRED-CALL prions first: they are the precise ones. `register(KEY)` present and
  // `unregister(KEY)` absent is an exact statement about a specific key, so these
  // produce almost no false positives. Validated against git history: this rule finds
  // the `equipment-changed` listener leak in the pre-fix CombatArenaScene/PolarisForestScene
  // — the defect that pinned 224 detached DOM nodes per visit and took a heap-graph walk
  // to locate — and reports the fixed files as clean.
  for (const [name, prion] of Object.entries(PAIRED_CALL_PRIONS)) {
    const hits = scanForPairedCallPrion(substrate, prion);
    if (hits.length) findings.push({ name, description: prion.description, hits, exact: true });
  }

  // TOKEN-WINDOW prions: coarser. They approximate "the same scope" with a character
  // window, so triage these by hand.
  for (const [name, prion] of Object.entries(PRION_LIBRARY)) {
    const hits = scanForPrion(substrate, prion, { minConfidence: 1 });
    if (hits.length) findings.push({ name, description: prion.description, hits, exact: false });
  }

  console.log('[probe] PRION REPORT — "Misfolded proteins"');
  console.log('===============================================================');
  if (!findings.length) {
    console.log('  Substrate is clean for every prion in the library.');
    return [];
  }

  for (const f of findings) {
    console.log(`\n  ${f.name}  (${f.hits.length} sites)  ${f.exact ? '[exact]' : '[heuristic — triage by hand]'}`);
    console.log(`  ${f.description}`);
    for (const h of f.hits.slice(0, 8)) {
      const key = h.key ? ` key="${h.key}"` : '';
      console.log(`     ${h.path}:${h.line}${key}`);
      if (h.evidence) console.log(`        ${h.evidence.slice(0, 72)}`);
    }
    if (f.hits.length > 8) console.log(`     ... and ${f.hits.length - 8} more`);
  }
  console.log('');
  return findings;
}

async function main() {
  const args = parseArgs();

  if (args.mode === 'hypothesis' && !args.hypothesis) {
    console.error('Usage: node scripts/cleri-probe.js "your bug hypothesis"');
    console.error('       node scripts/cleri-probe.js --mode=prion [--min-resonance=0.75] [--limit=20]');
    process.exit(1);
  }

  console.log('[probe] walking substrate...');
  const substrate = await walk(process.cwd());
  console.log(`[probe] substrate: ${substrate.length} files`);

  let heatmap;
  if (args.mode === 'prion') {
    heatmap = await runPrionMode(substrate);
  } else {
    heatmap = await runHypothesisMode(args.hypothesis, substrate, args.minResonance, args.limit);
  }

  console.log('\n[probe] ritual complete.');
  return heatmap;
}

main().catch(console.error);
