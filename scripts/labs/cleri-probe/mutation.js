#!/usr/bin/env node
/**
 * CLERI PROBE — Mutation / Anomaly Edition
 *
 * Phase-1 acceptance gate for the Harkov syntactic mutation detector.
 * Trains an order-2 Markov model on the codebase's NORMAL syntax, then asks:
 * do the 14 buggy archetypes score MORE anomalous (higher mean NLL) than
 * held-out clean code? If clean and buggy distributions don't separate, the
 * syntactic-Markov signal is too coarse and Phase 2 is not built.
 */
import fs from 'node:fs';
import path from 'node:path';
import { tokenizeToStates } from '../codex/core/immunity/syntax-tokenizer.js';
import { trainTransitionModel, sequenceLogLikelihood } from '../codex/core/immunity/harkov-mutation.engine.js';
import { PRION_SIGNATURES } from '../codex/core/immunity/phoneme-prion.engine.js';

const SKIP = new Set(['node_modules', '.git', 'dist', '.codex', 'Archive', 'vst', 'tests']);

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP.has(entry.name)) walk(path.join(dir, entry.name), out);
    } else if (/\.(js|jsx|ts|tsx)$/.test(entry.name)) {
      out.push(path.join(dir, entry.name));
    }
  }
  return out;
}

function mean(xs) { return xs.reduce((a, b) => a + b, 0) / xs.length; }

function main() {
  console.log('[probe] CLERI PROBE — Mutation / Anomaly Edition\n');

  // Deterministic sample: sort, take every Nth file, cap the corpus.
  const all = walk(process.cwd()).sort();
  const sampled = all.filter((_, i) => i % 3 === 0).slice(0, 800);

  // Split clean files: 80% train, 20% held-out scoring.
  const split = Math.floor(sampled.length * 0.8);
  const trainFiles = sampled.slice(0, split);
  const cleanHeldout = sampled.slice(split);

  console.log(`[probe] training on ${trainFiles.length} files, holding out ${cleanHeldout.length}`);
  const trainSeqs = [];
  for (const f of trainFiles) {
    const states = tokenizeToStates(fs.readFileSync(f, 'utf8'));
    if (states.length > 5) trainSeqs.push(states);
  }
  const model = trainTransitionModel(trainSeqs);
  console.log(`[probe] model vocab: ${model.vocabSize} states, ${model.ctxTotals.size} contexts\n`);

  const cleanScores = [];
  for (const f of cleanHeldout) {
    const states = tokenizeToStates(fs.readFileSync(f, 'utf8'));
    if (states.length > 5) cleanScores.push(sequenceLogLikelihood(model, states).meanNll);
  }

  const buggyScores = [];
  for (const [name, prion] of Object.entries(PRION_SIGNATURES)) {
    const states = tokenizeToStates(prion.buggyCode);
    if (states.length > 5) {
      const nll = sequenceLogLikelihood(model, states).meanNll;
      buggyScores.push({ name, nll });
    }
  }

  const cleanMean = mean(cleanScores);
  const buggyMean = mean(buggyScores.map(b => b.nll));
  const gap = buggyMean - cleanMean;

  console.log('[probe] ANOMALY (mean per-token NLL — higher = more anomalous)');
  console.log(`  clean held-out : ${cleanMean.toFixed(4)}  (n=${cleanScores.length})`);
  console.log(`  buggy archetypes: ${buggyMean.toFixed(4)}  (n=${buggyScores.length})`);
  console.log(`  separation gap  : ${gap.toFixed(4)}\n`);

  console.log('[probe] PER-ARCHETYPE ANOMALY');
  buggyScores.sort((a, b) => b.nll - a.nll).forEach(b => {
    console.log(`  ${b.nll.toFixed(3).padStart(7)}  ${b.name}`);
  });

  console.log('\n[probe] VERDICT');
  if (gap > 0.5) {
    console.log('  ✓ SIGNAL — buggy archetypes are meaningfully more anomalous than clean code.');
    console.log('    Phase 1 passes; Phase 2 (jury) is justified.');
  } else if (gap > 0.1) {
    console.log('  ⚠ WEAK — some separation, but small. Tune state abstraction before Phase 2.');
  } else {
    console.log('  ✗ FAIL — clean and buggy anomaly overlap. Syntactic-Markov is too coarse.');
    console.log('    Do NOT build Phase 2. Report numbers and reconsider the state representation.');
  }
  console.log('\n[probe] mutation probe complete.');
}

main();
