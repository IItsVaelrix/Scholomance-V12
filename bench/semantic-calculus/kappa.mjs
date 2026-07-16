/**
 * Phase 0.5 — Cohen's kappa over kind labels.
 *
 * Answers the question that gates Phase 1: are the seven kinds in types.ts a
 * partition two people can independently reproduce?
 *
 * Why this gates everything: §15 targets >=95% semantic act accuracy against a
 * gold corpus. If two humans only agree at kappa 0.6 on Theory-vs-Hypothesis,
 * then 95% is unreachable BY CONSTRUCTION — you would be tuning a compiler
 * against noise and calling the residual "model error". Speech-act taxonomies
 * have been contested for sixty years (Austin 1962, Searle 1975) for exactly the
 * reason this measures: the boundaries do not survive independent annotation.
 *
 * Usage:
 *   node bench/semantic-calculus/kappa.mjs labels/claude.jsonl labels/damien.jsonl
 *
 * Exit code 1 if kappa < 0.7 (the PDR's Phase 0.5 gate) — so CI can enforce it.
 */

import { readFileSync } from 'node:fs';

const KINDS = ['Do', 'Clarify', 'Probe', 'Forbidden', 'Escalate', 'Theory', 'Hypothesis'];

/**
 * The gate is TWO thresholds, not one, and this is load-bearing.
 *
 * An aggregate kappa hides a collapsed kind: two raters can systematically fuse
 * Hypothesis into Theory and Escalate into Forbidden, and the overall number
 * still clears 0.7 because the other five kinds carry it. Measured: a synthetic
 * rater doing exactly that scored kappa 0.784 overall (PASS) while Escalate sat
 * at 0.454 and Hypothesis at 0.500 — a third of the taxonomy dead, gate green.
 *
 * This is the same failure the PDR names for latency ("a single aggregate p95 can
 * conceal the expensive path"). Merging is a per-kind decision, so the gate must
 * be per-kind too.
 */
const GATE = 0.7; // overall
const GATE_PER_KIND = 0.6; // every kind, one-vs-rest

function readLabels(path) {
  const map = new Map();
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    const row = JSON.parse(line);
    if (!row.id || !row.kind) continue;
    if (!KINDS.includes(row.kind)) {
      throw new Error(`[kappa] ${path}: item ${row.id} has non-kind label "${row.kind}"`);
    }
    map.set(row.id, row.kind);
    if (typeof row.ms === 'number') (map.timings ??= new Map()).set(row.id, row.ms);
  }
  return map;
}

/**
 * Hesitation as a second, independent signal about boundary quality.
 * kappa says whether two people agreed. This says whether either of them was
 * SURE. A kind you both stall on is soft even when you happen to agree — and
 * that is exactly the kind a compiler will guess confidently and wrongly.
 */
function hesitationByKind(map) {
  if (!map.timings) return null;
  const acc = {};
  for (const [id, kind] of map) {
    const ms = map.timings.get(id);
    if (ms === undefined) continue;
    (acc[kind] ??= []).push(ms);
  }
  const out = {};
  for (const [kind, xs] of Object.entries(acc)) {
    const sorted = [...xs].sort((a, b) => a - b);
    out[kind] = { median: sorted[Math.floor(sorted.length / 2)], n: xs.length };
  }
  return out;
}

/**
 * Cohen's kappa = (po - pe) / (1 - pe)
 *   po = observed agreement
 *   pe = agreement expected by chance, from each rater's own marginal frequencies
 *
 * The marginals matter: two raters who both label everything "Do" agree 100% of
 * the time and have kappa 0 — chance already explains them. That is precisely
 * the failure mode to catch here, because "Do" is the tempting default.
 */
export function cohensKappa(a, b, categories = KINDS, { perCategory = true } = {}) {
  const ids = [...a.keys()].filter((id) => b.has(id));
  const n = ids.length;
  if (n === 0) return { n: 0, kappa: NaN, po: NaN, pe: NaN, matrix: {}, byCategory: {} };

  const matrix = {};
  for (const x of categories) {
    matrix[x] = Object.fromEntries(categories.map((y) => [y, 0]));
  }
  let agree = 0;
  for (const id of ids) {
    const x = a.get(id);
    const y = b.get(id);
    matrix[x][y] += 1;
    if (x === y) agree += 1;
  }

  const po = agree / n;
  const marginalA = Object.fromEntries(categories.map((c) => [c, ids.filter((i) => a.get(i) === c).length / n]));
  const marginalB = Object.fromEntries(categories.map((c) => [c, ids.filter((i) => b.get(i) === c).length / n]));
  const pe = categories.reduce((sum, c) => sum + marginalA[c] * marginalB[c], 0);

  // pe === 1 means neither rater discriminated at all (e.g. both labelled every
  // item "Do"). kappa is 0/0 there — genuinely undefined, NOT 1. Reporting 1
  // would let two lazy annotators pass the gate with worthless labels, which is
  // precisely the failure this statistic exists to catch. NaN fails `>= GATE`.
  const degenerate = pe === 1;
  const kappa = degenerate ? NaN : (po - pe) / (1 - pe);

  // Per-category kappa (one-vs-rest): WHICH kind is failing, not just that one is.
  // `perCategory: false` on the recursive call is load-bearing — without it this
  // recurses forever binarizing its own binarization.
  const byCategory = {};
  if (perCategory) {
    for (const c of categories) {
      const bin = (m) => new Map(ids.map((i) => [i, m.get(i) === c ? 'yes' : 'no']));
      const sub = cohensKappa(bin(a), bin(b), ['yes', 'no'], { perCategory: false });
      byCategory[c] = { kappa: sub.kappa, nA: Math.round(marginalA[c] * n), nB: Math.round(marginalB[c] * n) };
    }
  }

  return { n, kappa, po, pe, degenerate, matrix, byCategory, marginalA, marginalB };
}

/** Landis & Koch (1977) benchmarks. Conventional, not sacred. */
function interpret(k) {
  if (Number.isNaN(k)) return 'undefined';
  if (k < 0) return 'worse than chance';
  if (k < 0.21) return 'slight';
  if (k < 0.41) return 'fair';
  if (k < 0.61) return 'moderate';
  if (k < 0.81) return 'substantial';
  return 'almost perfect';
}

function main() {
  const [pathA, pathB] = process.argv.slice(2);
  if (!pathA || !pathB) {
    console.error('usage: node kappa.mjs <ratersA.jsonl> <ratersB.jsonl>');
    process.exit(2);
  }
  const a = readLabels(pathA);
  const b = readLabels(pathB);
  const r = cohensKappa(a, b);

  const nameA = pathA.split('/').pop().replace('.jsonl', '');
  const nameB = pathB.split('/').pop().replace('.jsonl', '');

  console.log(`\nCohen's kappa — ${nameA} vs ${nameB}`);
  console.log(`  overlapping items : ${r.n}`);
  console.log(`  observed agreement: ${(r.po * 100).toFixed(1)}%`);
  console.log(`  chance agreement  : ${(r.pe * 100).toFixed(1)}%`);
  console.log(`  kappa             : ${r.kappa.toFixed(3)}  (${interpret(r.kappa)})`);
  const weak = Object.entries(r.byCategory)
    .filter(([, v]) => !(v.kappa >= GATE_PER_KIND))
    .sort((x, y) => x[1].kappa - y[1].kappa);
  const passes = r.kappa >= GATE && weak.length === 0;
  console.log(`  overall gate >=${GATE} : ${r.kappa >= GATE ? 'pass' : 'FAIL'}`);
  console.log(`  per-kind gate >=${GATE_PER_KIND}: ${weak.length === 0 ? 'pass' : `FAIL (${weak.map(([k]) => k).join(', ')})`}`);
  console.log(`  PHASE 0.5 GATE     : ${passes ? 'PASS' : 'FAIL'}\n`);
  if (r.degenerate) {
    console.log('  !! DEGENERATE: neither rater discriminated (every item got the same kind).');
    console.log('     kappa is 0/0 here — undefined, not 1. Agreement this trivial is');
    console.log('     definitionally chance. Re-annotate; do not pass the gate on it.\n');
  }

  console.log('per-kind kappa (one-vs-rest) — which boundary is failing:');
  for (const [kind, v] of Object.entries(r.byCategory).sort((x, y) => x[1].kappa - y[1].kappa)) {
    const bar = '#'.repeat(Math.max(0, Math.round(v.kappa * 20)));
    console.log(`  ${kind.padEnd(11)} ${v.kappa.toFixed(3).padStart(6)}  ${bar.padEnd(20)} (${nameA}:${v.nA} ${nameB}:${v.nB})`);
  }

  console.log(`\nconfusion matrix (rows = ${nameA}, cols = ${nameB}):`);
  const w = 11;
  console.log(''.padEnd(w) + KINDS.map((k) => k.slice(0, 5).padStart(6)).join(''));
  for (const x of KINDS) {
    const row = KINDS.map((y) => {
      const v = r.matrix[x][y];
      return (v === 0 ? '.' : String(v)).padStart(6);
    }).join('');
    console.log(x.padEnd(w) + row);
  }

  for (const [label, map] of [[nameA, a], [nameB, b]]) {
    const h = hesitationByKind(map);
    if (!h) continue;
    const rows = Object.entries(h).sort((x, y) => y[1].median - x[1].median);
    const overall = Object.values(h).flatMap((v) => Array(v.n).fill(v.median)).sort((x, y) => x - y);
    const med = overall[Math.floor(overall.length / 2)] ?? 0;
    console.log(`\nhesitation — ${label} (median ${(med / 1000).toFixed(1)}s overall; slowest kinds first):`);
    for (const [kind, v] of rows.slice(0, 4)) {
      const flag = v.median > med * 1.5 ? '  <- soft boundary' : '';
      console.log(`  ${kind.padEnd(11)} ${(v.median / 1000).toFixed(1)}s  (n=${v.n})${flag}`);
    }
  }

  const disagreements = [...a.keys()].filter((id) => b.has(id) && a.get(id) !== b.get(id));
  if (disagreements.length) {
    console.log(`\n${disagreements.length} disagreements — these are the corpus's real boundary:`);
    for (const id of disagreements.slice(0, 15)) {
      console.log(`  ${id}  ${nameA}=${a.get(id).padEnd(10)} ${nameB}=${b.get(id)}`);
    }
    if (disagreements.length > 15) console.log(`  ... and ${disagreements.length - 15} more`);
  }

  if (passes) {
    console.log('\nVERDICT: the seven kinds survive independent annotation.');
    console.log('  Phase 1 acceptance stands; Phase 2 may proceed.');
  } else {
    console.log(`\nVERDICT: FAIL. MERGE KINDS BEFORE PHASE 2.`);
    if (r.kappa < GATE) console.log(`  Overall kappa ${r.kappa.toFixed(3)} < ${GATE}.`);
    for (const [kind, v] of weak) {
      const conf = KINDS
        .filter((o) => o !== kind)
        .map((o) => [o, (r.matrix[kind]?.[o] ?? 0) + (r.matrix[o]?.[kind] ?? 0)])
        .sort((x, y) => y[1] - x[1])[0];
      console.log(`  ${kind} kappa ${v.kappa.toFixed(3)} < ${GATE_PER_KIND}` +
        (conf && conf[1] > 0 ? ` — most confused with ${conf[0]} (${conf[1]}x). Consider merging them.` : ''));
    }
    console.log('\n  Seven is a choice, not a discovery. No downstream accuracy target is');
    console.log('  reachable above the annotation ceiling — tuning a compiler against');
    console.log('  these labels would be fitting noise and calling it model error.');
  }
  process.exit(passes ? 0 : 1);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
