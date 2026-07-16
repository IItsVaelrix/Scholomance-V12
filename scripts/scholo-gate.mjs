#!/usr/bin/env node
/**
 * SCHOLO GATE — Semantic Calculus in front of the CLI. SHADOW ONLY: runs nothing.
 *
 *   npx tsx scripts/scholo-gate.mjs "run the tests"
 *   npx tsx scripts/scholo-gate.mjs --log "fix the jitters"     # append to corpus
 *
 * Why here and not the Visualiser: the utterances exist (typing is the only way to
 * use a CLI), the lexicon is a manifest you already wrote (package.json), the risk
 * classes are real (lint reads, deploy ships), and the margin is real ("run the
 * tests" has six candidates). On the UI every one of those was decoration.
 *
 * The model — any model — plugs in at ONE seam: it ranks the closed set of scripts
 * that exist. It cannot invent a key, it cannot decide, and it never sees untrusted
 * context. Everything downstream is the compiler's, deterministically.
 */

import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { loadCliLexicon, knownKeys, entryFor, riskFor } from '../codex/core/semantic-calculus/cliLexicon.ts';
import { lexicalProposer, validateProposal, assessMargin } from '../codex/core/semantic-calculus/proposer.ts';
import { adjudicateLaw } from '../codex/core/semantic-calculus/kind.ts';

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

// ── The one seam a model is allowed into: rank what exists. ─────────────────
// Swap lexicalProposer for an LLM proposer and NOTHING below changes. That is the
// harness: the model reaches, the gate refuses, neither can overrule the other.
const proposal = { proposerId: lexicalProposer.id, slot: 'script', candidates: lexicalProposer.propose(utterance, 'script', known) };
validateProposal(proposal, known); // throws if the proposer minted a key

// Risk comes from the TOP candidate's real command, so a thin margin on `deploy`
// is judged by deploy's bar (0.5), not by lint's (0.15).
const top = [...proposal.candidates].sort((a, b) => b.score - a.score)[0];
const topEntry = top ? entryFor(lex, top.key) : undefined;
const risk = riskFor(topEntry?.consequence ?? 'security');

const verdict = assessMargin(proposal, risk);

let kind;
if (verdict.reason === 'no-candidates') kind = 'Theory';
else if (!verdict.decided) kind = 'Clarify';
else kind = entryFor(lex, verdict.pick.key)?.effect === 'read' ? 'Probe' : 'Do';

const law = adjudicateLaw({ kind, riskProfile: risk });

// ── Report ──────────────────────────────────────────────────────────────────
console.log(`\n  ${C.d}${utterance}${C.r}`);
console.log(`  ${C.d}${'─'.repeat(Math.min(60, utterance.length + 2))}${C.r}`);
console.log(`  ${KIND_COLOR[kind]}${C.b}${kind}${C.r}   ${C.d}law=${law.decision}  ${law.ruleIds.join(',')}${C.r}`);

if (verdict.reason === 'no-candidates') {
  console.log(`\n  ${C.m}Nothing in package.json binds this.${C.r}`);
  console.log(`  ${C.d}Not a vocabulary gap — you have no command for it. That is a`);
  console.log(`  feature request, and Theory is the correct answer.${C.r}`);
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
    margin: verdict.margin,
    capturedAt: new Date().toISOString(),
  }) + '\n');
  console.log(`  ${C.d}logged -> ${CORPUS}${C.r}\n`);
}
