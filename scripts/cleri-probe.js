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
import { vectorizeHypothesis, scanSubstrate } from '../codex/core/immunity/protein-probe.engine.js';

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', '.codex', 'Archive', 'ARCHIVE REFERENCE DOCS']);

/**
 * PRION LIBRARY — Genetic markers for misfolded code proteins.
 * 
 * A prion is a protein that misfolds and templates its misfolding onto others.
 * In code: a structural pattern that LOOKS like normal code but carries a defect.
 * 
 * GENETIC MARKERS = rare token n-grams that ONLY appear in the buggy pattern.
 * Not "async function" (everywhere) but "async function fetch .then" (missing await).
 * Not "array[0]" (everywhere) but "array[0] .length" (access without guard).
 * 
 * Each hypothesis is a precise syntactic fingerprint — the prion's DNA.
 * Tokens are space-separated to match the code-aware tokenizer (camelCase split, stemmed).
 */
const PRION_LIBRARY = Object.freeze({
  'unseeded-rng-deterministic': {
    // GENETIC MARKER: Math.random() in combat/procgen WITHOUT seedrandom/seed nearby
    // Rare: "Math.random" + "combat" + "procgen" + "deterministic" + NO "seed"
    hypothesis: 'Math.random combat procgen deterministic seedrandom',
    description: 'Unseeded Math.random in deterministic combat/procgen paths'
  },
  'missing-null-guard-external': {
    // GENETIC MARKER: fetch/axios .then(r => r.json()) WITHOUT ?. or ?? guard
    // Rare: "fetch" + "response.json" + "axios" + "res.data" + NO "optional" + NO "chaining" + NO "nullish"
    hypothesis: 'fetch response.json axios res.data optional chaining nullish',
    description: 'External API response accessed without null/undefined guards'
  },
  'assumed-array-length': {
    // GENETIC MARKER: arr[0] or arr[i] WITHOUT .length > 0 check in same scope
    // Rare: "array[0]" + "arr[0]" + "arr[i]" + "array[index]" + NO "length" + NO "check" + NO "bounds"
    hypothesis: 'array[0] arr[0] arr[i] array[index] length check bounds',
    description: 'Direct array index access without preceding bounds check'
  },
  'async-without-await': {
    // GENETIC MARKER: async function { fetch(); return promise; } — no await
    // Rare: "async" + "function" + "fetch" + "axios" + "return" + "promise" + NO "await"
    hypothesis: 'async function fetch axios return promise await',
    description: 'Async function returns promise without awaiting fetch/axios call'
  },
  'mutation-during-iteration': {
    // GENETIC MARKER: forEach/map callback containing push/splice/delete on same array
    // Rare: "forEach" + "map" + "push" + "splice" + "delete" + "same" + "array" + "mutation"
    hypothesis: 'forEach map push splice delete same array mutation iteration',
    description: 'Array mutated (push/splice/delete) during forEach/map iteration'
  },
  'race-condition-shared-state': {
    // GENETIC MARKER: Promise.all with shared object/array mutation
    // Rare: "Promise.all" + "shared" + "object" + "array" + "mutation" + "concurrent" + "race"
    hypothesis: 'Promise.all shared object array mutation concurrent race',
    description: 'Shared mutable state mutated concurrently in Promise.all'
  },
  'type-assertion-without-check': {
    // GENETIC MARKER: "as unknown as" or "as any" WITHOUT zod.parse/safeParse/validation
    // Rare: "as" + "unknown" + "as" + "any" + "type" + "assertion" + NO "zod" + NO "safeParse" + NO "parse" + NO "validation"
    hypothesis: 'as unknown as any type assertion zod safeParse parse validation',
    description: 'TypeScript assertion without runtime validation (zod, etc.)'
  },
  'resource-leak-no-cleanup': {
    // GENETIC MARKER: addEventListener/subscribe WITHOUT removeEventListener/unsubscribe in cleanup
    // Rare: "addEventListener" + "removeEventListener" + "useEffect" + "cleanup" + "return" + "unsubscribe"
    hypothesis: 'addEventListener removeEventListener useEffect cleanup return unsubscribe',
    description: 'Event listener added without cleanup in useEffect/component unmount'
  },
  'circular-dependency-risk': {
    // GENETIC MARKER: explicit circular dependency mention
    // Rare: "circular" + "dependency" + "import" + "export" + "cycle" + "detected" + "dynamic" + "import"
    hypothesis: 'circular dependency import export cycle detected dynamic import',
    description: 'Explicit circular dependency patterns in code/comments'
  },
  'silent-failure-swallowed-error': {
    // GENETIC MARKER: catch (e) { } OR catch (e) { console.log(e) } WITHOUT throw/rethrow
    // Rare: "catch" + "error" + "empty" + "block" + "console.log" + "console.error" + "silent" + "swallow" + NO "throw" + NO "rethrow"
    hypothesis: 'catch error empty block console.log console.error silent swallow throw rethrow',
    description: 'Catch block with empty body or only console logging'
  },
  'hardcoded-secret-config': {
    // GENETIC MARKER: actual secret-like strings + hardcoded assignment
    // Rare: "api_key" + "secret" + "token" + "password" + "=" + "hardcoded" + "process.env"
    hypothesis: 'api_key secret token password = " hardcoded process.env',
    description: 'Hardcoded secret values assigned to variables'
  },
  'infinite-loop-risk': {
    // GENETIC MARKER: while(true) or for(;;) WITHOUT break/return reachable
    // Rare: "while" + "true" + "for" + "infinite" + "loop" + "break" + "return" + "unreachable" + "termination"
    hypothesis: 'while true for infinite loop break return unreachable termination',
    description: 'Infinite loop with no reachable break/return condition'
  },
  'floating-point-equality': {
    // GENETIC MARKER: === or == comparison with floating point + NO epsilon
    // Rare: "===" + "==" + "floating" + "point" + "Number.EPSILON" + "Math.abs" + "epsilon" + "precision"
    hypothesis: '=== == floating point Number.EPSILON Math.abs epsilon precision',
    description: 'Direct floating-point equality without epsilon comparison'
  },
  'time-dependent-logic': {
    // GENETIC MARKER: Date.now/setTimeout/setInterval in test + NO fake timers
    // Rare: "Date.now" + "Date" + "setTimeout" + "setInterval" + "flaky" + "test" + "timing" + "non-deterministic" + NO "fake" + NO "timers" + NO "jest.useFakeTimers"
    hypothesis: 'Date.now setTimeout setInterval flaky test timing non-deterministic fake timers jest.useFakeTimers',
    description: 'Time-dependent logic in test or flaky contexts'
  },
  'prototype-pollution': {
    // GENETIC MARKER: Object.assign/merge with __proto__/constructor access
    // Rare: "Object.assign" + "merge" + "__proto__" + "constructor" + "prototype" + "pollution"
    hypothesis: 'Object.assign merge __proto__ constructor prototype pollution',
    description: 'Object merge with prototype pollution vectors'
  },
});

async function walk(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const res = path.join(dir, entry.name);
    const relPath = path.relative(process.cwd(), res);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) await walk(res, files);
    } else if (/\.(js|jsx|ts|tsx|json|md)$/.test(entry.name)) {
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
  const searchProtein = vectorizeHypothesis(hypothesis);
  console.log(`[probe] search protein fidelity: ${searchProtein.fidelity?.grade} (${searchProtein.fidelity?.score?.toFixed(4)})`);

  console.log('[probe] scanning substrate (codebase)...');
  const heatmap = scanSubstrate(substrate, searchProtein, { minResonance });

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

async function runPrionMode(substrate, minResonance, limit) {
  console.log('[probe] PRION SCAN — loading prion library...');
  console.log(`[probe] ${Object.keys(PRION_LIBRARY).length} prion archetypes loaded.`);

  // Pre-vectorize all prions
  const prionProteins = {};
  for (const [name, prion] of Object.entries(PRION_LIBRARY)) {
    console.log(`[probe]   vectorizing prion: ${name} — ${prion.description}`);
    prionProteins[name] = vectorizeHypothesis(prion.hypothesis);
  }

  console.log('\n[probe] scanning substrate for prion resonance...');
  
  const allHits = [];
  for (const [prionName, protein] of Object.entries(prionProteins)) {
    const heatmap = scanSubstrate(substrate, protein, { minResonance });
    for (const hit of heatmap) {
      allHits.push({ ...hit, prion: prionName, description: PRION_LIBRARY[prionName].description });
    }
  }

  // Sort by resonance descending
  allHits.sort((a, b) => b.resonance - a.resonance);

  console.log('\n[probe] PRION HEATMAP — "Misfolded proteins lighting up..."');
  console.log('===============================================================');

  if (allHits.length === 0) {
    console.log('Zero prion resonance detected. The substrate is clean.');
  } else {
    // Group by prion for summary
    const byPrion = {};
    for (const hit of allHits) {
      if (!byPrion[hit.prion]) byPrion[hit.prion] = [];
      byPrion[hit.prion].push(hit);
    }

    for (const [prionName, hits] of Object.entries(byPrion)) {
      const topHit = hits[0];
      const bar = '█'.repeat(Math.floor(topHit.resonance * 20));
      const percentage = (topHit.resonance * 100).toFixed(1);
      console.log(`\n  ${prionName} (${hits.length} files)`);
      console.log(`  ${percentage.padStart(5)}% ${bar.padEnd(20)} ${topHit.path}`);
      console.log(`  → ${topHit.description}`);
      
      // Show top 3 files for this prion
      hits.slice(1, 3).forEach(h => {
        const b = '█'.repeat(Math.floor(h.resonance * 20));
        const p = (h.resonance * 100).toFixed(1);
        console.log(`  ${p.padStart(5)}% ${b.padEnd(20)} ${h.path}`);
      });
      if (hits.length > 3) {
        console.log(`  ... and ${hits.length - 3} more files for this prion`);
      }
    }

    // Overall top hits
    console.log('\n[probe] TOP PRION HITS (all archetypes)');
    console.log('--------------------------------------------------');
    allHits.slice(0, limit).forEach(hit => {
      const bar = '█'.repeat(Math.floor(hit.resonance * 20));
      const percentage = (hit.resonance * 100).toFixed(1);
      console.log(`${percentage.padStart(5)}% ${bar.padEnd(20)} [${hit.prion}] ${hit.path}`);
    });
  }

  if (allHits.length > limit) {
    console.log(`\n... and ${allHits.length - limit} more total hits.`);
  }

  return allHits;
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
    heatmap = await runPrionMode(substrate, args.minResonance, args.limit);
  } else {
    heatmap = await runHypothesisMode(args.hypothesis, substrate, args.minResonance, args.limit);
  }

  console.log('\n[probe] ritual complete.');
  return heatmap;
}

main().catch(console.error);
