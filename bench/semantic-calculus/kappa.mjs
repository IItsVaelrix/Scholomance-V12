/**
 * Cohen's kappa over THREE INDEPENDENT CHANNELS (rev 7, P6).
 *
 * Answers the question that gates Phase 1: are the five kinds in types.ts a
 * partition two people can independently reproduce?
 *
 * Why this gates everything: §15 targets >=95% semantic act accuracy against a
 * gold corpus. If two humans only agree at kappa 0.6 on Theory-vs-Hypothesis,
 * then 95% is unreachable BY CONSTRUCTION — you would be tuning a compiler
 * against noise and calling the residual "model error". Speech-act taxonomies
 * have been contested for sixty years (Austin 1962, Searle 1975) for exactly the
 * reason this measures: the boundaries do not survive independent annotation.
 *
 * REV 7 — WHY THREE CHANNELS AND NEVER ONE NUMBER.
 *
 *   kappa_kind          what sort of thing was said
 *   kappa_warrant       what could justify treating the conclusion as knowledge
 *   kappa_justification would THESE cites justify THIS conclusion?
 *
 * These measure different failures and must never be averaged. A system can hold
 * excellent kappa_kind while kappa_justification is catastrophic: it would be
 * classifying utterances consistently while consistently dressing guesses in
 * decorative citations. Aggregating would hide exactly that, which is the same
 * mistake the per-kind gate below exists to prevent one level down.
 *
 * kappa_justification is the citation-theatre detector. It is the only channel
 * that asks whether the evidence bears on the claim rather than whether it is
 * present.
 *
 * Usage:
 *   node bench/semantic-calculus/kappa.mjs labels/claude.jsonl labels/damien.jsonl
 *   node bench/semantic-calculus/kappa.mjs --legacy old-a.jsonl old-b.jsonl
 *
 * Exit code 1 if any MEASURED channel misses its gate. An unmeasured channel is
 * reported UNMEASURED and never counted as a pass — absence of a measurement is
 * not evidence of agreement.
 */

import { readFileSync } from 'node:fs';

/** Rev 6 cut Forbidden and Escalate: they were law.decision values, not act types. */
export const KINDS = ['Do', 'Clarify', 'Probe', 'Theory', 'Hypothesis'];
export const CUT_KINDS = ['Forbidden', 'Escalate'];
const LEGACY_KINDS = [...KINDS, ...CUT_KINDS];

/** WarrantKind from types.ts, plus 'none' for "nothing could settle this yet". */
export const WARRANTS = ['lexicon', 'model', 'observation', 'human', 'gene', 'none'];
export const JUSTIFICATIONS = ['yes', 'no', 'unsure'];

/**
 * Each channel is scored on its own overlap, with its own marginals. A rater who
 * answered kind but skipped justification contributes to kappa_kind only.
 */
export const CHANNELS = [
  {
    key: 'kind',
    label: 'kappa_kind',
    question: 'What sort of thing was said?',
    categories: KINDS,
    gate: 0.7,
    perCategoryGate: 0.6,
  },
  {
    key: 'warrant',
    label: 'kappa_warrant',
    question: 'What could justify treating this as knowledge?',
    categories: WARRANTS,
    gate: 0.7,
    perCategoryGate: 0.6,
  },
  {
    key: 'justification',
    label: 'kappa_justification',
    question: 'Would these cites justify the reported conclusion?',
    categories: JUSTIFICATIONS,
    gate: 0.7,
    perCategoryGate: 0.6,
  },
];

/**
 * Every channel above carries TWO thresholds, not one, and this is load-bearing.
 *
 * An aggregate kappa hides a collapsed category: two raters can systematically
 * fuse Hypothesis into Theory and Escalate into Forbidden, and the overall number
 * still clears 0.7 because the other five kinds carry it. Measured: a synthetic
 * rater doing exactly that scored kappa 0.784 overall (PASS) while Escalate sat
 * at 0.454 and Hypothesis at 0.500 — a third of the taxonomy dead, gate green.
 *
 * This is the same failure the PDR names for latency ("a single aggregate p95 can
 * conceal the expensive path"). Merging is a per-category decision, so the gate
 * must be per-category too — and by the same argument one level up, the three
 * channels are never averaged into a single score.
 */

/**
 * Reads one rater's labels into one map PER CHANNEL.
 *
 * Rev-5 labels (Forbidden/Escalate) are refused rather than folded into the
 * five-kind taxonomy. Projecting Escalate onto Do would be inventing a label the
 * rater never gave: those annotations answer a different question, and the
 * disagreement they recorded is precisely the evidence that cut the enum. Score
 * the historical measurement with --legacy; do not launder it into this one.
 */
export function readLabels(path, { legacy = false } = {}) {
  const kinds = legacy ? LEGACY_KINDS : KINDS;
  const byChannel = new Map(CHANNELS.map((c) => [c.key, new Map()]));
  const timings = new Map();
  const cut = new Set();

  for (const line of readFileSync(path, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    const row = JSON.parse(line);
    if (!row.id) continue;

    if (row.kind !== undefined) {
      if (CUT_KINDS.includes(row.kind) && !legacy) {
        cut.add(row.kind);
      } else if (!kinds.includes(row.kind)) {
        throw new Error(`[kappa] ${path}: item ${row.id} has non-kind label "${row.kind}"`);
      } else {
        byChannel.get('kind').set(row.id, row.kind);
      }
    }
    if (row.warrant !== undefined) {
      if (!WARRANTS.includes(row.warrant)) {
        throw new Error(`[kappa] ${path}: item ${row.id} has non-warrant label "${row.warrant}"`);
      }
      byChannel.get('warrant').set(row.id, row.warrant);
    }
    if (row.justification !== undefined) {
      if (!JUSTIFICATIONS.includes(row.justification)) {
        throw new Error(`[kappa] ${path}: item ${row.id} has non-justification label "${row.justification}"`);
      }
      byChannel.get('justification').set(row.id, row.justification);
    }
    if (typeof row.ms === 'number') timings.set(row.id, row.ms);
  }

  if (cut.size) {
    throw new Error(
      `[kappa] ${path}: contains rev-5 kinds (${[...cut].join(', ')}) that no longer exist.\n` +
      `        Rev 6 cut them — they were law.decision values duplicated in the kind enum.\n` +
      `        Re-annotate against the five kinds, or pass --legacy to reproduce the\n` +
      `        historical seven-kind measurement. These labels will not be re-projected.`,
    );
  }

  const kindMap = byChannel.get('kind');
  kindMap.timings = timings;
  return { byChannel, timings };
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
    // Name the offender. Three channels share this function with different
    // category sets, so a mismatch is a real mistake and must not surface as
    // "cannot read properties of undefined" from the matrix lookup below.
    for (const [who, v] of [['a', x], ['b', y]]) {
      if (!categories.includes(v)) {
        throw new Error(
          `[kappa] rater ${who} labelled item "${id}" as "${v}", which is not in the ` +
          `category set [${categories.join(', ')}]`,
        );
      }
    }
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

/** One channel's report. Returns 'pass' | 'fail' | 'unmeasured'. */
function reportChannel(channel, a, b, nameA, nameB, legacy) {
  const categories = channel.key === 'kind' && legacy ? LEGACY_KINDS : channel.categories;
  const r = cohensKappa(a, b, categories);

  console.log(`\n${'═'.repeat(64)}`);
  console.log(`${channel.label}  —  ${channel.question}`);
  console.log('═'.repeat(64));

  if (r.n === 0) {
    console.log(`  UNMEASURED — no item carries a \`${channel.key}\` label from both raters.`);
    console.log(`  Annotate it:  node bench/semantic-calculus/annotate.mjs --as <name> --channel ${channel.key}`);
    console.log('  This is not a pass. An unmeasured channel is an unknown, and the');
    console.log('  point of this channel is that it can fail while the others look fine.');
    return 'unmeasured';
  }

  /**
   * A category NEITHER rater ever used has no data, so its one-vs-rest kappa is
   * a division by nothing — it must not fail the gate. Reporting "kappa 1.000,
   * per-category FAIL (model, human, gene, none)" for four categories absent
   * from the corpus is incoherent, and it trains you to ignore the gate.
   *
   * A category only ONE rater used is different and still fails: that is a
   * collapsed category — real, measured disagreement about whether it exists.
   */
  const absent = Object.entries(r.byCategory).filter(([, v]) => v.nA === 0 && v.nB === 0);
  const scored = Object.entries(r.byCategory).filter(([, v]) => !(v.nA === 0 && v.nB === 0));
  const weak = scored
    .filter(([, v]) => !(v.kappa >= channel.perCategoryGate))
    .sort((x, y) => x[1].kappa - y[1].kappa);
  const passes = r.kappa >= channel.gate && weak.length === 0;

  console.log(`  overlapping items : ${r.n}`);
  console.log(`  observed agreement: ${(r.po * 100).toFixed(1)}%`);
  console.log(`  chance agreement  : ${(r.pe * 100).toFixed(1)}%`);
  console.log(`  kappa             : ${r.kappa.toFixed(3)}  (${interpret(r.kappa)})`);
  console.log(`  gate >=${channel.gate}        : ${r.kappa >= channel.gate ? 'pass' : 'FAIL'}`);
  console.log(`  per-category >=${channel.perCategoryGate}: ${weak.length === 0 ? 'pass' : `FAIL (${weak.map(([k]) => k).join(', ')})`}`);
  if (absent.length) {
    console.log(`  absent from corpus: ${absent.map(([k]) => k).join(', ')}` +
      `  ${'(unmeasured — not scored, not a pass)'}`);
  }

  if (r.degenerate) {
    console.log('\n  !! DEGENERATE: neither rater discriminated (every item got the same label).');
    console.log('     kappa is 0/0 here — undefined, not 1. Agreement this trivial is');
    console.log('     definitionally chance. Re-annotate; do not pass the gate on it.');
  }

  console.log('\n  per-category kappa (one-vs-rest) — which boundary is failing:');
  for (const [cat, v] of Object.entries(r.byCategory).sort((x, y) => x[1].kappa - y[1].kappa)) {
    if (v.nA === 0 && v.nB === 0) continue;
    const bar = '#'.repeat(Math.max(0, Math.round(v.kappa * 20)));
    console.log(`    ${cat.padEnd(12)} ${v.kappa.toFixed(3).padStart(6)}  ${bar.padEnd(20)} (${nameA}:${v.nA} ${nameB}:${v.nB})`);
  }

  console.log(`\n  confusion matrix (rows = ${nameA}, cols = ${nameB}):`);
  const w = 13;
  console.log('  ' + ''.padEnd(w) + categories.map((k) => k.slice(0, 5).padStart(6)).join(''));
  for (const x of categories) {
    const row = categories.map((y) => {
      const v = r.matrix[x][y];
      return (v === 0 ? '.' : String(v)).padStart(6);
    }).join('');
    console.log('  ' + x.padEnd(w) + row);
  }

  const disagreements = [...a.keys()].filter((id) => b.has(id) && a.get(id) !== b.get(id));
  if (disagreements.length) {
    console.log(`\n  ${disagreements.length} disagreements — the corpus's real boundary here:`);
    for (const id of disagreements.slice(0, 10)) {
      console.log(`    ${id}  ${nameA}=${String(a.get(id)).padEnd(11)} ${nameB}=${b.get(id)}`);
    }
    if (disagreements.length > 10) console.log(`    ... and ${disagreements.length - 10} more`);
  }

  if (!passes && channel.key === 'kind') {
    for (const [kind, v] of weak) {
      const conf = categories
        .filter((o) => o !== kind)
        .map((o) => [o, (r.matrix[kind]?.[o] ?? 0) + (r.matrix[o]?.[kind] ?? 0)])
        .sort((x, y) => y[1] - x[1])[0];
      console.log(`\n  ${kind} kappa ${v.kappa.toFixed(3)} < ${channel.perCategoryGate}` +
        (conf && conf[1] > 0 ? ` — most confused with ${conf[0]} (${conf[1]}x). Consider merging them.` : ''));
    }
  }

  if (!passes && channel.key === 'justification') {
    console.log('\n  CITATION THEATRE. Two readers cannot agree whether the cites bear on');
    console.log('  the conclusion. Every other channel can look healthy while this one');
    console.log('  fails — that is a system classifying confidently and justifying');
    console.log('  decoratively. Fix the cites, not the classifier.');
  }

  return passes ? 'pass' : 'fail';
}

function main() {
  const argv = process.argv.slice(2);
  const legacy = argv.includes('--legacy');
  const [pathA, pathB] = argv.filter((x) => !x.startsWith('--'));
  if (!pathA || !pathB) {
    console.error('usage: node kappa.mjs [--legacy] <ratersA.jsonl> <ratersB.jsonl>');
    process.exit(2);
  }
  const a = readLabels(pathA, { legacy });
  const b = readLabels(pathB, { legacy });

  const nameA = pathA.split('/').pop().replace('.jsonl', '');
  const nameB = pathB.split('/').pop().replace('.jsonl', '');

  console.log(`\nSemantic annotation agreement — ${nameA} vs ${nameB}`);
  if (legacy) {
    console.log(`${'-'.repeat(64)}`);
    console.log('LEGACY MODE — scoring the historical seven-kind taxonomy.');
    console.log('Forbidden and Escalate were cut in rev 6. This reproduces the old');
    console.log('measurement; it does not describe the compiler that ships today.');
  }
  console.log(`${'-'.repeat(64)}`);
  console.log('Three channels, three questions, never averaged. A system can hold');
  console.log('excellent kappa_kind while kappa_justification is catastrophic.');

  const results = {};
  for (const channel of CHANNELS) {
    results[channel.key] = reportChannel(
      channel,
      a.byChannel.get(channel.key),
      b.byChannel.get(channel.key),
      nameA,
      nameB,
      legacy,
    );
  }

  for (const [label, parsed] of [[nameA, a], [nameB, b]]) {
    const h = hesitationByKind(parsed.byChannel.get('kind'));
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

  console.log(`\n${'═'.repeat(64)}`);
  console.log('VERDICT — per channel. There is no combined score by design.');
  console.log('═'.repeat(64));
  for (const channel of CHANNELS) {
    const v = results[channel.key];
    const mark = v === 'pass' ? 'PASS' : v === 'fail' ? 'FAIL' : 'UNMEASURED';
    console.log(`  ${channel.label.padEnd(20)} ${mark}`);
  }

  const failed = CHANNELS.filter((c) => results[c.key] === 'fail');
  const unmeasured = CHANNELS.filter((c) => results[c.key] === 'unmeasured');

  if (failed.length === 0 && unmeasured.length === 0) {
    console.log('\n  All three channels survive independent annotation.');
    console.log('  The kinds reproduce, the warrants reproduce, and the cites bear on');
    console.log('  the conclusions. Phase 2 may proceed.');
  } else {
    if (failed.length) {
      console.log(`\n  FAILING: ${failed.map((c) => c.label).join(', ')}.`);
      console.log('  No downstream accuracy target is reachable above the annotation');
      console.log('  ceiling — tuning against these labels would be fitting noise and');
      console.log('  calling it model error.');
    }
    if (unmeasured.length) {
      console.log(`\n  UNMEASURED: ${unmeasured.map((c) => c.label).join(', ')}.`);
      console.log('  Not a pass. These are the channels that catch a system which');
      console.log('  classifies well and justifies badly; leaving them unmeasured means');
      console.log('  that failure would be invisible rather than absent.');
    }
  }
  console.log('');
  process.exit(failed.length === 0 ? 0 : 1);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
