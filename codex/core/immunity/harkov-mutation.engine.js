// Order-2 Markov ("Hidden Harkov") model over syntactic state sequences.
// P(next | prev2, prev1) with add-k (Laplace) smoothing. Deterministic.

const BOUNDARY = ''; // sequence-start padding symbol (never a real node type)
const SEP = '';      // context-key separator (never a real node type)

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
