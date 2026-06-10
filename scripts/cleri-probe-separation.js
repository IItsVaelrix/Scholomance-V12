#!/usr/bin/env node
/**
 * CLERI PROBE — Separation / Confusion Edition
 *
 * The invalidating sanity test for the phoneme prion detector.
 *
 * Question: are the 14 prion archetypes actually DISTINGUISHABLE from each
 * other in TurboQuant resonance space? A detector is only real if a file
 * resonates with the RIGHT prion much more than with the others.
 *
 * If cross-prion (off-diagonal) resonance ≈ self (diagonal) resonance, the
 * signatures have collapsed together — every "hit" is noise wearing a label.
 *
 * Uses the exact same machinery as the live detector:
 *   initializePrionLibrary() + estimateInnerProduct()
 *
 * Usage: node scripts/cleri-probe-separation.js [--collision=0.90]
 */

import { initializePrionLibrary } from '../codex/core/immunity/phoneme-prion.engine.js';
import { estimateInnerProduct } from '../codex/core/quantization/turboquant.js';

function normResonance(a, b) {
  if (!a?.data?.length || !b?.data?.length) return 0;
  const r = estimateInnerProduct(a.data, b.data, a.norm, b.norm);
  return Math.max(0, Math.min(1, (r + 1) / 2));
}

function pct(x) {
  return (x * 100).toFixed(0).padStart(3);
}

function parseArgs() {
  const out = { collision: 0.9 };
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--collision=')) out.collision = parseFloat(arg.split('=')[1]) || 0.9;
  }
  return out;
}

async function main() {
  const { collision } = parseArgs();

  console.log('[probe] CLERI PROBE — Separation / Confusion Edition');
  console.log('[probe] Question: are the prion archetypes distinguishable at all?\n');

  const library = await initializePrionLibrary();
  const names = Object.keys(library);
  const N = names.length;
  console.log(`\n[probe] ${N} prion archetypes vectorized.\n`);

  // Full pairwise resonance matrix.
  const M = names.map(ri => names.map(cj => normResonance(library[ri], library[cj])));

  // ── Self-check: the probe must be trustworthy before we read it. ──
  // Every signature should resonate ~1.0 with itself. If not, the metric
  // (not the prions) is broken and the rest of the numbers are meaningless.
  const diag = names.map((_, i) => M[i][i]);
  const minDiag = Math.min(...diag);
  console.log('[probe] SELF-CHECK (diagonal should be ~1.00):');
  console.log(`[probe]   min self-resonance = ${minDiag.toFixed(4)}`);
  if (minDiag < 0.99) {
    console.log('[probe]   ⚠ WARNING: a signature does not max-resonate with itself.');
    console.log('[probe]   The resonance metric is suspect — cross-class numbers below are unreliable.\n');
  } else {
    console.log('[probe]   ✓ metric sound — proceeding to cross-class separation.\n');
  }

  // ── Confusion matrix ──
  console.log('[probe] CONFUSION MATRIX (resonance %, row vs column)');
  const header = '     ' + names.map((_, j) => String(j).padStart(3)).join(' ');
  console.log(header);
  for (let i = 0; i < N; i++) {
    const row = M[i].map((v, j) => (i === j ? '  ·' : pct(v))).join(' ');
    console.log(`${String(i).padStart(2)} | ${row}`);
  }
  console.log('\n[probe] LEGEND');
  names.forEach((n, i) => console.log(`  ${String(i).padStart(2)}  ${n}`));

  // ── Per-prion margin: self vs nearest confuser ──
  console.log('\n[probe] PER-PRION SEPARATION (self − nearest other prion)');
  console.log('  idx  self  confuser%  margin  nearest-confuser');
  const margins = [];
  for (let i = 0; i < N; i++) {
    let bestJ = -1;
    let best = -1;
    for (let j = 0; j < N; j++) {
      if (j === i) continue;
      if (M[i][j] > best) { best = M[i][j]; bestJ = j; }
    }
    const margin = diag[i] - best;
    margins.push({ i, self: diag[i], confuse: best, margin, confuserName: names[bestJ] });
    console.log(
      `  ${String(i).padStart(3)}  ${diag[i].toFixed(2)}    ${pct(best)}     ${margin >= 0 ? ' ' : ''}${margin.toFixed(2)}  ${names[bestJ]}`,
    );
  }

  // ── Aggregates ──
  const off = [];
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) if (i !== j) off.push(M[i][j]);
  const meanDiag = diag.reduce((a, b) => a + b, 0) / N;
  const meanOff = off.reduce((a, b) => a + b, 0) / off.length;
  const maxOff = Math.max(...off);
  const worst = margins.reduce((a, b) => (b.margin < a.margin ? b : a));
  const collisions = off.filter(v => v >= collision).length / 2; // symmetric pairs

  console.log('\n[probe] AGGREGATE SEPARABILITY');
  console.log(`  mean self-resonance (diagonal)     : ${meanDiag.toFixed(4)}`);
  console.log(`  mean cross-resonance (off-diagonal): ${meanOff.toFixed(4)}`);
  console.log(`  separation gap (diag − off)        : ${(meanDiag - meanOff).toFixed(4)}`);
  console.log(`  max cross-resonance (worst overlap): ${maxOff.toFixed(4)}`);
  console.log(`  worst-separated prion              : [${worst.i}] ${names[worst.i]} (margin ${worst.margin.toFixed(3)} vs ${worst.confuserName})`);
  console.log(`  colliding pairs (≥ ${collision})           : ${collisions} of ${(N * (N - 1)) / 2}`);

  // ── Verdict ──
  console.log('\n[probe] VERDICT');
  const gap = meanDiag - meanOff;
  if (worst.margin <= 0) {
    console.log('  ✗ FAIL — at least one prion resonates with another MORE than itself.');
    console.log('    The signatures are not separable. Hits cannot be trusted as labels.');
  } else if (meanOff > 0.85 && worst.margin < 0.05) {
    console.log('  ✗ FAIL — cross-resonance is high and margins are razor-thin.');
    console.log('    The archetypes have collapsed together; the detector emits noise.');
  } else if (gap < 0.15 || worst.margin < 0.1) {
    console.log('  ⚠ WEAK — some separation exists but margins are small.');
    console.log('    Expect frequent mislabeling; not yet trustworthy as a classifier.');
  } else {
    console.log('  ✓ SEPARABLE — diagonal dominates and margins hold.');
    console.log('    The archetypes are distinguishable; safe to wire into the pulse ledger.');
  }
  console.log('\n[probe] separation probe complete.');
}

main().catch(err => { console.error(err); process.exit(1); });
