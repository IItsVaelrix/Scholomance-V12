#!/usr/bin/env node
/**
 * CLERI PROBE — Prosodic Metronome Edition
 *
 * Measures the stress-shift homograph disambiguator. It only fires when it reads
 * a function-word beat, so we report two honest numbers:
 *   - PRECISION: of the cases it answered, how many were right.
 *   - COVERAGE:  of all cases, how many it dared answer (vs deferred to G2P).
 * Deferring on an ambiguous frame (e.g. a bare imperative) is correct behavior,
 * not a failure — the metronome should not guess.
 */
import { STRESS_SHIFT_HOMOGRAPHS, pronounceWithMeter } from '../codex/core/phonology/prosodic-metronome.js';

// { sentence, target word, expected sense } — mix of framed and bare-imperative cases.
const CASES = [
  { s: 'she set a new record',        w: 'record',   want: 'noun' },
  { s: 'they will record the show',   w: 'record',   want: 'verb' },
  { s: 'record the show now',         w: 'record',   want: 'verb' },   // bare imperative — should defer
  { s: 'a lovely present for you',    w: 'present',   want: 'noun' },
  { s: 'i present the plan today',    w: 'present',   want: 'verb' },
  { s: 'a strange object appeared',   w: 'object',    want: 'noun' },
  { s: 'i object to that ruling',     w: 'object',    want: 'verb' },
  { s: 'the fresh produce aisle',     w: 'produce',   want: 'noun' },
  { s: 'we produce better results',   w: 'produce',   want: 'verb' },
  { s: 'sign the contract today',     w: 'contract',  want: 'noun' },
  { s: 'you contract the muscle',     w: 'contract',  want: 'verb' },
  { s: 'the vast desert stretched',   w: 'desert',    want: 'noun' },
  { s: 'they desert their posts',     w: 'desert',    want: 'verb' },
  { s: 'muscles contract slowly',     w: 'contract',  want: 'verb' },   // content-word subject — should defer
];

function eq(a, b) { return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((x, i) => x === b[i]); }

function main() {
  console.log('[probe] CLERI PROBE — Prosodic Metronome Edition\n');

  let answered = 0;
  let correct = 0;
  let wrong = 0;
  let deferred = 0;

  console.log('[probe] PER-CASE');
  for (const c of CASES) {
    const tokens = c.s.split(/\s+/);
    const idx = tokens.findIndex(t => t.toLowerCase().replace(/[^a-z']/g, '') === c.w);
    const out = pronounceWithMeter(c.w, tokens, idx);
    const entry = STRESS_SHIFT_HOMOGRAPHS[c.w];

    let verdict;
    if (out === null) { deferred += 1; verdict = '· defer'; }
    else {
      answered += 1;
      if (eq(out, entry[c.want])) { correct += 1; verdict = '✓ ' + c.want; }
      else { wrong += 1; verdict = '✗ WRONG'; }
    }
    console.log(`  ${verdict.padEnd(9)} ${c.w.padEnd(9)} "${c.s}"`);
  }

  const total = CASES.length;
  const precision = answered > 0 ? (correct / answered * 100) : 0;
  const coverage = (answered / total) * 100;

  console.log('\n[probe] RESULTS');
  console.log(`  total cases : ${total}`);
  console.log(`  answered    : ${answered}  (correct ${correct}, wrong ${wrong})`);
  console.log(`  deferred    : ${deferred}  (abstained — correct behavior, falls back to G2P)`);
  console.log(`  PRECISION   : ${precision.toFixed(1)}%  (of answered)`);
  console.log(`  COVERAGE    : ${coverage.toFixed(1)}%  (of all cases)`);

  console.log('\n[probe] VERDICT');
  if (precision >= 95 && coverage >= 60) {
    console.log('  ✓ The metronome is high-precision on framed cases and abstains cleanly.');
    console.log('    Stress-shift class lifted from the 50% context-free baseline where a beat exists.');
  } else if (precision >= 95) {
    console.log('  ⚠ High precision but low coverage — frame reader needs more cues (imperatives, subjects).');
  } else {
    console.log('  ✗ Precision below bar — the frame reader is mis-placing stress. Inspect failures.');
  }
  console.log('\n[probe] metronome probe complete.');
}

main();
