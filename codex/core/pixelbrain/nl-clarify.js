/**
 * NL-CLARIFY — the margin law for nl-compile.
 *
 * Semantic Calculus F4/F15: a thin binding must become Clarify/Theory, never a
 * soft Do. `compilePromptToAsset()` is total in the wrong way — it answers every
 * prompt, including ones it does not understand, by falling through `|| 'stone'`
 * defaults into a confident checksummed asset. That default IS the null the
 * doctrine forbids; it is worse than null, because null is honest.
 *
 * This module does not invent a similarity score. It measures the one signal the
 * pipeline actually produces: which content words in the prompt bound to any
 * entity slot, and which did not.
 *
 * What this catches:  "infernal plumed helm" -> nothing binds -> Theory.
 * What it does NOT catch: a term that binds confidently to the WRONG candidate
 *   (e.g. plume -> fire when the VOID Set means hair). That needs a set-aware
 *   lexicon with >=2 candidates and a real margin between them. See assessMargin().
 */

/** Words that carry no binding obligation. */
const STOPWORDS = new Set([
  'a', 'an', 'the', 'of', 'with', 'and', 'or', 'in', 'on', 'at', 'to',
  'for', 'from', 'by', 'is', 'it', 'its', 'that', 'this',
]);

/** Below this fraction of bound content words, the prompt is not understood. */
export const MIN_BINDING_COVERAGE = 0.5;

/** Below this margin between the top two candidates, the choice is not decided. */
export const MIN_SEMANTIC_MARGIN = 0.15;

function contentTerms(text) {
  const terms = String(text || '').toLowerCase().match(/[a-z][a-z-]*/g) || [];
  return terms.filter((t) => !STOPWORDS.has(t) && t.length > 2);
}

function boundVocabulary(entities) {
  const bound = new Set();
  for (const value of Object.values(entities || {})) {
    if (!Array.isArray(value)) continue;
    for (const v of value) bound.add(String(v).toLowerCase());
  }
  return bound;
}

/**
 * Which content words in the prompt reached any entity slot?
 * @returns {{ content: string[], bound: string[], unbound: string[], coverage: number }}
 */
export function assessBinding(text, parsed) {
  const content = contentTerms(text);
  const vocab = boundVocabulary(parsed?.entities);
  const unbound = content.filter(
    (term) => ![...vocab].some((b) => term.includes(b) || b.includes(term)),
  );
  const coverage = content.length === 0 ? 0 : (content.length - unbound.length) / content.length;
  return { content, bound: [...vocab], unbound, coverage };
}

/**
 * The margin half of the law, for when a lexicon DOES offer alternatives.
 * Today no caller supplies candidates, so this is inert by construction —
 * which is itself the finding: you cannot measure a margin you never compute.
 *
 * @param {Array<{id: string, score: number}>} candidates - ranked, best first
 */
export function assessMargin(candidates) {
  const ranked = [...(candidates || [])].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  if (ranked.length === 0) return { decided: false, margin: 0, reason: 'no-candidates' };
  if (ranked.length === 1) return { decided: true, margin: 1, reason: 'sole-candidate', pick: ranked[0] };
  const margin = (ranked[0].score ?? 0) - (ranked[1].score ?? 0);
  return {
    decided: margin >= MIN_SEMANTIC_MARGIN,
    margin,
    reason: margin >= MIN_SEMANTIC_MARGIN ? 'clear-margin' : 'thin-margin',
    pick: ranked[0],
    rival: ranked[1],
  };
}

/**
 * The kind rule. Returns a typed act, never a soft Do.
 *
 * @returns {{ kind: 'Do'|'Clarify'|'Theory', binding: object, question?: string, deposit?: object }}
 */
export function selectKind(text, parsed, options = {}) {
  const minCoverage = options.minCoverage ?? MIN_BINDING_COVERAGE;
  const binding = assessBinding(text, parsed);

  // Nothing in the prompt reached the lexicon. This is not a thin margin; it is
  // no binding at all. Deposit it rather than defaulting to stone.
  if (binding.coverage === 0) {
    return {
      kind: 'Theory',
      binding,
      deposit: {
        unboundTerms: binding.unbound,
        intent: parsed?.intent ?? 'UNKNOWN',
        why: 'no content term in the prompt bound to any entity slot',
      },
      question: `I have no binding for: ${binding.unbound.join(', ')}. What are these?`,
    };
  }

  // Partial binding: some of the prompt landed, some did not. Ask, do not guess.
  if (binding.coverage < minCoverage) {
    return {
      kind: 'Clarify',
      binding,
      question: `I bound ${binding.bound.join(', ')} but not: ${binding.unbound.join(', ')}. What are those?`,
    };
  }

  return { kind: 'Do', binding };
}
