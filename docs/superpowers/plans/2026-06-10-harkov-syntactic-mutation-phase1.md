# Harkov Syntactic Mutation Detector — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Phase-1 anomaly gate — tokenize code into syntactic state sequences, train an order-2 Harkov model on the codebase's normal syntax, and score how improbable (mutated) a snippet is — then prove with a probe that buggy archetypes score more anomalous than clean code.

**Architecture:** Two small pure modules (`syntax-tokenizer`, `harkov-mutation.engine`) plus an integration probe. The tokenizer uses `@babel/parser` + `@babel/traverse` to turn code into an ordered sequence of AST node-type "states" (name-agnostic, sound-agnostic). The engine trains an order-2 Markov transition model with add-k smoothing and scores mean per-token negative log-likelihood (NLL) as the anomaly signal. The probe is the acceptance gate; if clean vs buggy NLL distributions don't separate, Phase 2 is not built.

**Tech Stack:** Node ESM, `@babel/parser` ^7.29, `@babel/traverse` ^7.29, vitest ^4.

---

## File Structure

- `codex/core/immunity/syntax-tokenizer.js` — **new.** `tokenizeToStates(code) → string[]`. Sole responsibility: parse → ordered AST node-type sequence. No model logic.
- `codex/core/immunity/harkov-mutation.engine.js` — **new.** `trainTransitionModel`, `transitionProbability`, `sequenceLogLikelihood`. Sole responsibility: the order-2 Markov math. No I/O, no parsing.
- `scripts/cleri-probe-mutation.js` — **new.** Corpus walk + train + score clean-vs-buggy + verdict. The acceptance gate. Orchestration only.
- `tests/core/immunity/syntax-tokenizer.test.js` — **new.**
- `tests/core/immunity/harkov-mutation.engine.test.js` — **new.**

Phase 2 (jurors voting on mutation class) is **out of scope** for this plan and will be planned only after this probe passes.

---

### Task 1: Syntactic Tokenizer

**Files:**
- Create: `codex/core/immunity/syntax-tokenizer.js`
- Test: `tests/core/immunity/syntax-tokenizer.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
// tests/core/immunity/syntax-tokenizer.test.js
import { describe, it, expect } from 'vitest';
import { tokenizeToStates } from '../../../codex/core/immunity/syntax-tokenizer.js';

describe('tokenizeToStates', () => {
  it('produces an ordered AST node-type sequence', () => {
    const states = tokenizeToStates('const x = f();');
    expect(states[0]).toBe('File');
    expect(states).toContain('VariableDeclaration');
    expect(states).toContain('CallExpression');
  });

  it('is name-agnostic: two snippets with different identifiers but identical structure produce identical states', () => {
    const a = tokenizeToStates('function foo(bar){ return bar.baz; }');
    const b = tokenizeToStates('function qux(zap){ return zap.wob; }');
    expect(a).toEqual(b);
  });

  it('parses TypeScript and JSX without throwing', () => {
    expect(tokenizeToStates('const x: number = 1;').length).toBeGreaterThan(0);
    expect(tokenizeToStates('const el = <div className="a">hi</div>;').length).toBeGreaterThan(0);
  });

  it('returns [] for empty or non-string input', () => {
    expect(tokenizeToStates('')).toEqual([]);
    expect(tokenizeToStates(null)).toEqual([]);
    expect(tokenizeToStates(42)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/core/immunity/syntax-tokenizer.test.js`
Expected: FAIL — `Failed to resolve import ... syntax-tokenizer.js` (module does not exist yet).

- [ ] **Step 3: Write minimal implementation**

```javascript
// codex/core/immunity/syntax-tokenizer.js
import { parse } from '@babel/parser';
import traversePkg from '@babel/traverse';

// @babel/traverse ships a CJS default export; normalize for ESM.
const traverse = traversePkg.default ?? traversePkg;

/**
 * Parse code and return the pre-order sequence of AST node types.
 * Name-agnostic and sound-agnostic: only structure survives.
 * @param {string} code
 * @returns {string[]} ordered node-type states (empty on bad input)
 */
export function tokenizeToStates(code) {
  if (typeof code !== 'string' || code.trim().length === 0) return [];

  let ast;
  try {
    ast = parse(code, {
      sourceType: 'unambiguous',
      errorRecovery: true,
      plugins: ['typescript', 'jsx'],
    });
  } catch {
    return [];
  }

  const states = [];
  try {
    traverse(ast, {
      enter(path) {
        states.push(path.node.type);
      },
    });
  } catch {
    return [];
  }
  return states;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/core/immunity/syntax-tokenizer.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add codex/core/immunity/syntax-tokenizer.js tests/core/immunity/syntax-tokenizer.test.js
git commit -m "feat(immunity): syntactic tokenizer (AST node-type sequence)"
```

---

### Task 2: Harkov Transition Model + Likelihood Scorer

**Files:**
- Create: `codex/core/immunity/harkov-mutation.engine.js`
- Test: `tests/core/immunity/harkov-mutation.engine.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
// tests/core/immunity/harkov-mutation.engine.test.js
import { describe, it, expect } from 'vitest';
import {
  trainTransitionModel,
  transitionProbability,
  sequenceLogLikelihood,
} from '../../../codex/core/immunity/harkov-mutation.engine.js';

describe('harkov mutation engine', () => {
  it('scores in-distribution sequences as less anomalous than out-of-distribution', () => {
    const train = [
      ['A', 'B', 'C', 'A', 'B', 'C'],
      ['A', 'B', 'C', 'A', 'B', 'C'],
    ];
    const model = trainTransitionModel(train);
    const inDist = sequenceLogLikelihood(model, ['A', 'B', 'C', 'A', 'B', 'C']);
    const outDist = sequenceLogLikelihood(model, ['C', 'C', 'C', 'A', 'A', 'A']);
    expect(inDist.meanNll).toBeLessThan(outDist.meanNll);
  });

  it('never returns infinite NLL for unseen transitions (add-k smoothing)', () => {
    const model = trainTransitionModel([['A', 'B', 'A', 'B']]);
    const r = sequenceLogLikelihood(model, ['X', 'Y', 'Z']);
    expect(Number.isFinite(r.meanNll)).toBe(true);
    expect(r.meanNll).toBeGreaterThan(0);
  });

  it('is deterministic: same corpus produces identical probabilities', () => {
    const corpus = [['A', 'B', 'C'], ['A', 'B', 'D']];
    const m1 = trainTransitionModel(corpus);
    const m2 = trainTransitionModel(corpus);
    expect(transitionProbability(m1, 'A', 'B', 'C'))
      .toBe(transitionProbability(m2, 'A', 'B', 'C'));
  });

  it('returns Infinity meanNll for an empty sequence', () => {
    const model = trainTransitionModel([['A', 'B']]);
    expect(sequenceLogLikelihood(model, []).meanNll).toBe(Infinity);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/core/immunity/harkov-mutation.engine.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```javascript
// codex/core/immunity/harkov-mutation.engine.js
// Order-2 Markov ("Hidden Harkov") model over syntactic state sequences.
// P(next | prev2, prev1) with add-k (Laplace) smoothing. Deterministic.

const BOUNDARY = ''; // sequence-start padding symbol
const SEP = '';

function contextKey(a, b) {
  return a + SEP + b;
}

/**
 * @param {string[][]} sequences
 * @param {{k?: number}} [options] add-k smoothing constant (default 1)
 */
export function trainTransitionModel(sequences, options = {}) {
  const k = options.k ?? 1;
  const vocab = new Set();
  const ctxCounts = new Map(); // ctxKey -> Map(next -> count)
  const ctxTotals = new Map(); // ctxKey -> total count

  for (const seq of sequences) {
    if (!Array.isArray(seq) || seq.length === 0) continue;
    for (const s of seq) vocab.add(s);
    const padded = [BOUNDARY, BOUNDARY, ...seq];
    for (let i = 2; i < padded.length; i += 1) {
      const ctx = contextKey(padded[i - 2], padded[i - 1]);
      const next = padded[i];
      if (!ctxCounts.has(ctx)) ctxCounts.set(ctx, new Map());
      const row = ctxCounts.get(ctx);
      row.set(next, (row.get(next) || 0) + 1);
      ctxTotals.set(ctx, (ctxTotals.get(ctx) || 0) + 1);
    }
  }

  return { k, vocabSize: vocab.size, ctxCounts, ctxTotals };
}

export function transitionProbability(model, prev2, prev1, next) {
  const { k, vocabSize, ctxCounts, ctxTotals } = model;
  const V = Math.max(1, vocabSize);
  const ctx = contextKey(prev2, prev1);
  const total = ctxTotals.get(ctx) || 0;
  const count = ctxCounts.get(ctx)?.get(next) || 0;
  return (count + k) / (total + k * V);
}

/**
 * Mean per-token negative log-likelihood. Higher = more anomalous (mutated).
 * @returns {{ meanNll: number, tokens: number }}
 */
export function sequenceLogLikelihood(model, states) {
  if (!Array.isArray(states) || states.length === 0) {
    return { meanNll: Infinity, tokens: 0 };
  }
  const padded = [BOUNDARY, BOUNDARY, ...states];
  let nll = 0;
  let n = 0;
  for (let i = 2; i < padded.length; i += 1) {
    const p = transitionProbability(model, padded[i - 2], padded[i - 1], padded[i]);
    nll += -Math.log(p);
    n += 1;
  }
  return { meanNll: nll / n, tokens: n };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/core/immunity/harkov-mutation.engine.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add codex/core/immunity/harkov-mutation.engine.js tests/core/immunity/harkov-mutation.engine.test.js
git commit -m "feat(immunity): order-2 Harkov transition model + NLL anomaly scorer"
```

---

### Task 3: Mutation Probe (acceptance gate)

**Files:**
- Create: `scripts/cleri-probe-mutation.js`

This is the integration test / objective function. It trains the normal-syntax model on a sample of codebase files, then compares anomaly (mean NLL) of held-out clean files against the 14 buggy archetypes from `PRION_SIGNATURES`.

- [ ] **Step 1: Write the probe**

```javascript
// scripts/cleri-probe-mutation.js
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
```

- [ ] **Step 2: Run the probe**

Run: `node scripts/cleri-probe-mutation.js`
Expected: prints clean vs buggy mean NLL, per-archetype anomaly, and a verdict. Acceptance: `separation gap > 0.5` (SIGNAL). A WEAK or FAIL verdict is a legitimate, reportable outcome — record the numbers, do not proceed to Phase 2.

- [ ] **Step 3: Commit**

```bash
git add scripts/cleri-probe-mutation.js
git commit -m "feat(immunity): mutation/anomaly probe — Phase 1 acceptance gate"
```

---

## Self-Review

**Spec coverage:**
- Syntactic tokenizer (drop sound, keep arrangement) → Task 1. ✓
- Normal-syntax order-2 Harkov model + `sequenceLogLikelihood` → Task 2. ✓
- Mutation probe + clean-vs-buggy success metric + kill-criterion → Task 3. ✓
- Determinism → Task 2 test (identical probabilities) + deterministic corpus sampling in the probe. ✓
- Phase 2 (jury) → intentionally out of scope, gated on Task 3. ✓

**Placeholder scan:** No TBD/TODO; every code step contains complete code; every run step has an exact command and expected outcome.

**Type consistency:** `tokenizeToStates → string[]` consumed by `trainTransitionModel(string[][])` and `sequenceLogLikelihood(model, string[])`. `sequenceLogLikelihood` returns `{ meanNll, tokens }` — the probe reads `.meanNll`. `trainTransitionModel` returns `{ k, vocabSize, ctxCounts, ctxTotals }` — the probe reads `.vocabSize` and `.ctxTotals.size`, both defined. Consistent.

---

## Notes for the implementer
- `@babel/traverse`'s default-export interop (`traversePkg.default ?? traversePkg`) is the one ESM gotcha — Task 1 handles it.
- The probe is deterministic (sorted walk, fixed stride/cap) so reruns are comparable.
- Keep state abstraction at bare `node.type` for the MVP. Only enrich (depth/token-kind) if the verdict is WEAK — that's the first tuning lever, not a day-one feature.
