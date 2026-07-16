#!/usr/bin/env node
/**
 * SCHOLO GATE — Semantic Calculus in front of the CLI. SHADOW ONLY: runs nothing.
 *
 *   npx tsx scripts/scholo-gate.mjs "run the tests"
 *   npx tsx scripts/scholo-gate.mjs --log "fix the jitters"
 *
 * Rev 7: prints orthogonal epistemic fields (gap / method / warrants) without
 * splitting Theory into sub-kinds.
 */

import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { loadCliLexicon, knownKeys, entryFor, riskFor } from '../codex/core/semantic-calculus/cliLexicon.ts';
import { lexicalProposer, validateProposal, assessMargin } from '../codex/core/semantic-calculus/proposer.ts';
import { adjudicateLaw } from '../codex/core/semantic-calculus/kind.ts';
import { deriveEpistemic } from '../codex/core/semantic-calculus/epistemic.ts';
import { bindInquiryProbe } from '../codex/core/semantic-calculus/probeRegistry.ts';
import { routeUtterance } from '../codex/core/semantic-calculus/lexicons.ts';

const C = { d: '\x1b[2m', b: '\x1b[1m', r: '\x1b[0m', g: '\x1b[32m', y: '\x1b[33m', c: '\x1b[36m', red: '\x1b[31m', m: '\x1b[35m' };
const KIND_COLOR = { Do: C.g, Clarify: C.y, Probe: C.c, Theory: C.m, Hypothesis: '\x1b[38;5;208m' };
const CORPUS = 'bench/semantic-calculus/corpus/cli-intents.jsonl';

const args = process.argv.slice(2);
const shouldLog = args.includes('--log');
const utterance = args.filter((a) => !a.startsWith('--')).join(' ').trim();

if (!utterance) {
  console.error('usage: npx tsx scripts/scholo-gate.mjs [--log] "<what you want>"');
  process.exit(2);
}

const lex = loadCliLexicon();
const known = knownKeys(lex);

const proposal = { proposerId: lexicalProposer.id, slot: 'script', candidates: lexicalProposer.propose(utterance, 'script', known) };
validateProposal(proposal, known);

const top = [...proposal.candidates].sort((a, b) => b.score - a.score)[0];
const topEntry = top ? entryFor(lex, top.key) : undefined;
const risk = riskFor(topEntry?.consequence ?? 'security');

const verdict = assessMargin(proposal, risk);

// P4 — route by epistemic role BEFORE the proposer gets a vote. This gate's
// action lexicon is package.json scored fuzzily, so without this a diagnosis
// sharing one token with a script ("listen", "build") would arrive as a Do
// candidate. exactActionBind is false here because this proposer never binds
// exactly; it only ever scores.
const role = routeUtterance({ utterance, exactActionBind: false });
const inquiry = role === 'inquiry' ? bindInquiryProbe(utterance) : undefined;

let kind;
let bound = false;
let unknownReferent = false;
let hasUnresolvedSlots = false;
let needsEvidence = false;
let phase = 'atomic';
let probeNote = '';

if (role === 'inquiry' && inquiry) {
  kind = 'Probe';
  bound = true;
  needsEvidence = true;
  phase = 'plan';
  probeNote = inquiry.id;
} else if (role === 'inquiry') {
  // Claimed by inquiry, bound by nothing in it: the method is missing, not the
  // script. Never fall through to the action proposer here.
  kind = 'Theory';
} else if (verdict.reason === 'no-candidates') {
  kind = 'Theory';
} else if (!verdict.decided) {
  kind = 'Clarify';
  hasUnresolvedSlots = true;
  bound = true;
} else {
  bound = true;
  kind = entryFor(lex, verdict.pick.key)?.effect === 'read' ? 'Probe' : 'Do';
}

const law = adjudicateLaw({ kind, riskProfile: risk });
const epistemic = deriveEpistemic({
  kind,
  bound,
  hasUnresolvedSlots,
  unknownReferent,
  needsEvidence,
  hasObservationReceipts: false,
  hasGeneCites: false,
  utterance,
  // Only the inquiry role informs the gap, and only because it means a real
  // lexicon claimed and missed. 'action' is NOT passed: a miss against
  // package.json says which lexicon failed to bind, never what the speaker
  // asked for, and asserting it forced gap='command' onto every unbound Theory.
  lexiconRole: role === 'inquiry' ? 'inquiry' : undefined,
});

// ── Report ──────────────────────────────────────────────────────────────────
console.log(`\n  ${C.d}${utterance}${C.r}`);
console.log(`  ${C.d}${'─'.repeat(Math.min(60, utterance.length + 2))}${C.r}`);
console.log(`  ${KIND_COLOR[kind]}${C.b}${kind}${C.r}   ${C.d}law=${law.decision}  ${law.ruleIds.join(',')}${C.r}`);
console.log(
  `  ${C.d}epistemic.gap=${epistemic.gap}  method=${epistemic.method}  phase=${phase}${C.r}`,
);
console.log(
  `  ${C.d}warrant required=[${epistemic.warrantRequired.join(',')}]  present=[${epistemic.warrantPresent.join(',')}]${C.r}`,
);

if (probeNote) {
  console.log(`\n  ${C.c}Probe plan${C.r}  ${C.b}${probeNote}${C.r}`);
  console.log(`  ${C.d}Sealed method only — no observations ran. Submit receipts for a report.${C.r}`);
} else if (role === 'inquiry') {
  console.log(`\n  ${C.m}The inquiry lexicon claimed this and has no formula for it.${C.r}`);
  console.log(`  ${C.d}Not scored against package.json: a diagnosis is not a script to run.`);
  console.log(`  Write a Probe formula (observations + falsifiers) — that is the missing unit.${C.r}`);
} else if (verdict.reason === 'no-candidates') {
  console.log(`\n  ${C.m}Nothing in package.json binds this.${C.r}`);
  if (epistemic.gap === 'procedure') {
    console.log(`  ${C.d}Epistemic gap is procedure — this looks like a diagnosis, not a missing script.`);
    console.log(`  Prefer a Probe formula (inquiry lexicon) over inventing a Do.${C.r}`);
  } else if (epistemic.gap === 'command') {
    console.log(`  ${C.d}Epistemic gap is command — you have no npm script for this.`);
    console.log(`  That is a feature request; Theory is the correct kind.${C.r}`);
  } else {
    console.log(`  ${C.d}Epistemic gap is ${epistemic.gap}. Theory remains the kind.${C.r}`);
  }
} else if (!verdict.decided) {
  console.log(`\n  ${C.y}margin ${verdict.margin.toFixed(3)} < ${risk.minMargin} (${risk.consequence}) — too close to call${C.r}`);
  console.log(`  ${C.b}Did you mean:${C.r}`);
  console.log(`    ${C.g}${verdict.pick.key}${C.r}  ${C.d}${verdict.pick.score.toFixed(2)} · ${entryFor(lex, verdict.pick.key)?.command.slice(0, 46)}${C.r}`);
  console.log(`    ${C.g}${verdict.rival.key}${C.r}  ${C.d}${verdict.rival.score.toFixed(2)} · ${entryFor(lex, verdict.rival.key)?.command.slice(0, 46)}${C.r}`);
  const rest = [...proposal.candidates].sort((a, b) => b.score - a.score).slice(2, 5);
  for (const c of rest) console.log(`    ${C.d}${c.key}  ${c.score.toFixed(2)}${C.r}`);
} else {
  const e = entryFor(lex, verdict.pick.key);
  console.log(`\n  ${C.b}${verdict.pick.key}${C.r}  ${C.d}${e?.command}${C.r}`);
  console.log(`  ${C.d}margin ${verdict.margin.toFixed(3)} >= ${risk.minMargin}  ·  ${verdict.reason}  ·  ${e?.consequence}/${e?.effect}${C.r}`);
}

const wouldRun = kind === 'Do' && law.decision === 'allow';
console.log(`\n  ${C.d}would execute:${C.r} ${wouldRun ? `${C.g}yes${C.r}` : `${C.red}NO${C.r}`}` +
  `  ${C.d}(kind=Do AND law=allow)  ·  nothing ran either way${C.r}\n`);

if (shouldLog) {
  mkdirSync(dirname(CORPUS), { recursive: true });
  appendFileSync(CORPUS, JSON.stringify({
    id: `cli-${Date.now().toString(36)}`,
    utterance,
    lexiconVersion: lex.version,
    proposerId: proposal.proposerId,
    candidates: proposal.candidates,
    kind,
    law: law.decision,
    epistemic,
    phase,
    probeId: probeNote || undefined,
    margin: verdict.margin,
    schemaVersion: 'SEMANTIC_ACT_v2',
    capturedAt: new Date().toISOString(),
  }) + '\n');
  console.log(`  ${C.d}logged -> ${CORPUS}${C.r}\n`);
}
