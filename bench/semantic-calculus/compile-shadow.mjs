/**
 * Phase 5 — compile the captured shadow corpus with the REAL sealed compiler.
 *
 * The overlay shows a live kind via kind.ts (crypto-free, browser-safe). This runs
 * the whole pipeline — digests, draftHash, capability, seal — over what was
 * actually captured, and reports where the compiler and the human disagreed.
 *
 * Run with tsx, because the compiler is .ts and node 20 cannot load it:
 *   npx tsx bench/semantic-calculus/compile-shadow.mjs
 *
 * This is the measurement Phase 0.5 could not make. Its corpus was synthetic
 * strings with no state; these are real utterances captured with the route and
 * selection they were said in.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileSemanticIntent } from '../../codex/core/semantic-calculus/compiler.ts';
import { emptyContext } from '../../codex/core/semantic-calculus/trustPartition.ts';
import { toUtterance, userUtterance, derivedUtterance } from '../../codex/core/semantic-calculus/utterance.ts';
import { assertSealedIntact } from '../../codex/core/semantic-calculus/seal.ts';
import { resolveCites } from '../../codex/core/semantic-calculus/citeResolver.ts';
import { literalKeywordProposer, stubSemanticKeywordProposer, composeProposers }
  from '../../codex/core/semantic-calculus/keywordProposer.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const CORPUS = join(HERE, 'corpus', 'shadow-intents.jsonl');

const C = { d: '\x1b[2m', b: '\x1b[1m', r: '\x1b[0m', g: '\x1b[32m', y: '\x1b[33m', c: '\x1b[36m', red: '\x1b[31m', m: '\x1b[35m' };

if (!existsSync(CORPUS)) {
  console.error(`\nNo shadow corpus yet: ${CORPUS}\n`);
  console.error('Capture some first:');
  console.error('  1. ENABLE_SEMANTIC_CALCULUS=1 npm run dev');
  console.error('  2. open the Visualiser, hit Ctrl+; and say what you want\n');
  process.exit(2);
}

const rows = readFileSync(CORPUS, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
console.log(`\n${C.b}shadow corpus${C.r}  ${rows.length} real intents\n`);

// The model proposes keywords; ripgrep refuses the ones the repo has never heard
// of. Cites resolve BEFORE the compile — repo state must never reach a sealed body
// (F18), so the compiler adjudicates evidence it is handed and never investigates.
const proposer = composeProposers(stubSemanticKeywordProposer, literalKeywordProposer);

/**
 * F21 — replay the provenance the row RECORDED, never a convenient assumption.
 *
 * A row captured before provenance existed did not say who spoke, and a caller
 * that did not say is untrusted by law. Silently replaying old rows as 'user'
 * would be inventing the one field that decides whether the act could execute —
 * and this report would then describe a compiler nobody is running.
 */
const spokenFor = (row) => {
  if (row.utteranceTrust === 'user') return userUtterance(row.utterance);
  if (row.utteranceTrust === 'derived') return derivedUtterance(row.utterance, row.utteranceTaint ?? []);
  return toUtterance(row.utterance); // undeclared -> untrusted
};

const results = rows.map((row) => {
  const context = { ...emptyContext(), user: { ...row.state } };
  const resolved = resolveCites(row.utterance, ['/payload/unboundUtterance'], { proposer });
  const { act } = compileSemanticIntent({
    utterance: spokenFor(row),
    context,
    cites: resolved.cites,
    principalId: 'shadow',
    logicalTime: 0,
  });
  assertSealedIntact(act); // every act must verify, or the run is meaningless
  return { row, act, resolved, drift: row.clientKind && row.clientKind !== act.kind };
});

// ── 0. What did the evidence layer find for each real intent? ────────────────
console.log(`${C.b}cites${C.r}  ${C.d}proposer: ${proposer.id}${C.r}`);
for (const { row, resolved } of results) {
  console.log(`\n  ${C.c}${JSON.stringify(row.utterance)}${C.r}`);
  console.log(`    ${C.d}proposed:${C.r} ${resolved.proposed.map((k) => k.keyword).join(', ') || '(none)'}`);
  if (resolved.refuted.length)
    console.log(`    ${C.d}refuted :${C.r} ${C.y}${resolved.refuted.join(', ')}${C.r} ${C.d}<- searched; the repo has never heard of these (a finding about the MODEL)${C.r}`);
  for (const u of resolved.unsearched)
    console.log(`    ${C.d}unsearched:${C.r} ${C.m}${u.keyword}${C.r} ${C.d}<- ${u.reason.slice(0, 62)} (a finding about the GOVERNOR)${C.r}`);
  if (!resolved.cites.length) console.log(`    ${C.d}cites   : (none)${C.r}`);
  for (const c of resolved.cites.slice(0, 3)) console.log(`    ${C.g}cite    :${C.r} ${c.stableId}`);
  if (resolved.errors.length) console.log(`    ${C.red}errors  : ${resolved.errors[0].slice(0, 70)}${C.r}`);
}
console.log();

// ── 1. Does the browser agree with the sealed compiler? ──────────────────────
const drifted = results.filter((r) => r.drift);
console.log(`${C.b}frontend/backend drift${C.r}  ${drifted.length}/${results.length}`);
if (drifted.length) {
  console.log(`  ${C.red}kind.ts in the browser disagreed with the sealed compile — this must be 0${C.r}`);
  for (const d of drifted.slice(0, 5)) {
    console.log(`    ${JSON.stringify(d.row.utterance)}  client=${d.row.clientKind} server=${d.act.kind}`);
  }
} else {
  console.log(`  ${C.g}none — the overlay and the sealed compiler are the same code path${C.r}`);
}

// ── 2. What did the compiler actually decide? ────────────────────────────────
const byKind = {};
for (const { act } of results) byKind[act.kind] = (byKind[act.kind] ?? 0) + 1;
console.log(`\n${C.b}kinds emitted${C.r}`);
for (const [k, n] of Object.entries(byKind).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${k.padEnd(11)} ${String(n).padStart(3)}  ${'█'.repeat(Math.round((n / results.length) * 32))}`);
}

const wouldExecute = results.filter((r) => r.act.kind === 'Do' && r.act.law.decision === 'allow');
console.log(`\n${C.b}would execute${C.r}  ${wouldExecute.length}/${results.length}  ` +
  `${C.d}(kind=Do AND law=allow AND capability)${C.r}`);

// ── 3. Lexicon coverage — the number that actually matters ───────────────────
const theory = results.filter((r) => r.act.kind === 'Theory');
console.log(`\n${C.b}lexicon coverage${C.r}  ${(((results.length - theory.length) / results.length) * 100).toFixed(0)}%` +
  `  ${C.d}(${theory.length} unbound -> Theory)${C.r}`);
if (theory.length) {
  console.log(`  ${C.y}the top unbound intents ARE the roadmap — each is a lexicon entry you don't have:${C.r}`);
  const counts = {};
  for (const t of theory) {
    const u = t.row.utterance.toLowerCase().trim();
    counts[u] = (counts[u] ?? 0) + 1;
  }
  for (const [u, n] of Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 12)) {
    console.log(`    ${String(n).padStart(2)}x  ${JSON.stringify(u)}`);
  }
}

// ── 4. PHENOTYPIC ERROR: ideal minus observed ────────────────────────────────
// Not a pass/fail count. A 'wrong' verdict with no expectedKind is an observed
// phenotype with no ideal — unscoreable by construction.
const KINDS = ['Do', 'Clarify', 'Probe', 'Theory', 'Hypothesis'];
const judged = results.filter((r) => r.row.verdict && r.row.verdict !== 'unsure');
const scoreable = judged.filter((r) => r.row.verdict === 'correct' || r.row.expectedKind);

if (scoreable.length) {
  const ideal = (r) => (r.row.verdict === 'correct' ? r.act.kind : r.row.expectedKind);
  const hits = scoreable.filter((r) => ideal(r) === r.act.kind).length;
  console.log(`\n${C.b}phenotype fitness${C.r}  ${hits}/${scoreable.length} = ` +
    `${((hits / scoreable.length) * 100).toFixed(0)}%  ${C.d}(observed kind == your ideal kind)${C.r}`);

  const m = {};
  for (const k of KINDS) m[k] = Object.fromEntries(KINDS.map((j) => [j, 0]));
  for (const r of scoreable) m[ideal(r)][r.act.kind] += 1;

  console.log(`\n${C.b}phenotypic error${C.r}  ${C.d}(rows = your ideal, cols = what it emitted)${C.r}`);
  console.log('  ' + ''.padEnd(11) + KINDS.map((k) => k.slice(0, 5).padStart(7)).join(''));
  for (const i of KINDS) {
    const row = KINDS.map((o) => {
      const v = m[i][o];
      if (v === 0) return '.'.padStart(7);
      return (i === o ? `${C.g}${v}${C.r}` : `${C.red}${v}${C.r}`).padStart(7 + (C.g.length + C.r.length));
    }).join('');
    if (KINDS.some((o) => m[i][o])) console.log('  ' + i.padEnd(11) + row);
  }

  const errs = scoreable.filter((r) => ideal(r) !== r.act.kind);
  if (errs.length) {
    console.log(`\n  ${C.y}every miss, with the state it was said in:${C.r}`);
    for (const e of errs.slice(0, 20)) {
      const st = e.row.state;
      console.log(`    ${JSON.stringify(e.row.utterance).padEnd(38)} ${C.red}got ${e.act.kind}${C.r}, ` +
        `${C.g}wanted ${ideal(e)}${C.r}  ${C.d}@ ${st.route}${st.selection ? ` track=${st.selection}` : ''}${C.r}`);
    }
  }
} else {
  console.log(`\n${C.d}no scoreable verdicts yet — press ✗ and say what it SHOULD have been.${C.r}`);
  console.log(`${C.d}A bare 'wrong' records an observed phenotype with no ideal, and`);
  console.log(`phenotypic error is ideal MINUS observed. Without the ideal there is`);
  console.log(`nothing to subtract from.${C.r}`);
}

const unscoreable = judged.filter((r) => r.row.verdict === 'wrong' && !r.row.expectedKind);
if (unscoreable.length) {
  console.log(`\n  ${C.d}${unscoreable.length} rows marked wrong with no ideal — complaints, not measurements${C.r}`);
}

// ── 5. Replay identity, on real data ─────────────────────────────────────────
// Replay must re-submit the SAME evidence. Cites are inside the sealed body, so
// "same utterance + same context" is NOT the whole input — the determinism list is
// (utterance, context digests, formula versions, lattice map, gene snapshot,
// compiler identity) AND the submitted evidence. Recompiling without the cites
// compares two different inputs and reports 0% as if the compiler were broken.
//
// This is exactly why cites live IN the act: an act carries everything needed to
// reproduce itself. Replay feeds act.cites back, it does not re-resolve them —
// re-resolving would consult the repo, and repo state is not a declared input.
let identical = 0;
for (const { row, act } of results) {
  const again = compileSemanticIntent({
    utterance: spokenFor(row),
    context: { ...emptyContext(), user: { ...row.state } },
    cites: act.cites,
    principalId: 'shadow',
    logicalTime: 0,
  }).act;
  if (again.seal.digest === act.seal.digest) identical += 1;
}
const pct = ((identical / results.length) * 100).toFixed(2);
console.log(`\n${C.b}replay identity${C.r}  ${identical}/${results.length} = ${pct}%  ` +
  `${pct === '100.00' ? C.g + 'as required — determinism is a property, not a rate' : C.red + 'DEFECT: a hidden clock or unstable ordering'}${C.r}`);

console.log(`\n${C.d}Nothing above executed. Shadow only.${C.r}\n`);
