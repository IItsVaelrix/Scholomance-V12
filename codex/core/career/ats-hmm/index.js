/**
 * ATS legibility pass + public API (forked from codex/core/shared/syntax/hmmPass.js).
 *
 * Wires the prose tokenizer to the SHARED, verse-free `englishSyntaxHMM` (reused, never
 * forked) and the ATS arbiter. Per physical line it runs Viterbi for content/function
 * roles AND recomputes that path's log-likelihood from the model's public config — the
 * core `predict()` discards the score, so we re-derive it here without touching the core.
 *
 * The result is the legibility half of the résumé pipeline: the keyword-gap analyzer
 * measures relevance, this measures whether the prose reads naturally. Pure/deterministic.
 */

import { englishSyntaxHMM } from "../../hmm.js";
import { tokenizeResume, ATS_FUNCTION_WORDS } from "./atsSyntaxTokens.js";
import { buildAtsArbiterSummary } from "./atsArbiter.model.js";

// Mirrors the floor the core Viterbi uses for log(0), keeping our re-derived score on the
// same scale as the model's internal computation.
const LOG_ZERO = -1e10;
const log = (n) => (n <= 0 ? LOG_ZERO : Math.log(n));

/**
 * Log-likelihood of a decoded role path under the shared HMM, reusing only public surface
 * (`config`, `getEmissionProb`). Returns the per-token average so lines of different
 * lengths are comparable.
 */
function perTokenPathLogProb(hmm, observations, roles, functionWords) {
  const n = observations.length;
  if (n === 0) return Number.NaN;
  const { startProbabilities, transitionProbabilities } = hmm.config;

  const isFunc = (w) => functionWords.has(String(w).toLowerCase());
  let lp = log(startProbabilities[roles[0]]) + log(hmm.getEmissionProb(roles[0], observations[0], isFunc(observations[0])));
  for (let t = 1; t < n; t += 1) {
    const trans = transitionProbabilities[roles[t - 1]]?.[roles[t]] || 0;
    lp += log(trans) + log(hmm.getEmissionProb(roles[t], observations[t], isFunc(observations[t])));
  }
  return lp / n;
}

/**
 * Runs the HMM legibility pass: predicts roles per line, refines token roles (preserving
 * precursor-context decisions exactly as the verse pass does), and returns the tokens plus
 * a line→per-token-log-prob map for the arbiter.
 *
 * @param {Array<object>} tokens - from {@link tokenizeResume}
 * @param {Set<string>} functionWords
 * @returns {{ tokens: Array<object>, perTokenLogProbByLine: Map<number, number> }}
 */
export function runAtsHmmPass(tokens, functionWords = ATS_FUNCTION_WORDS) {
  const perTokenLogProbByLine = new Map();
  if (!Array.isArray(tokens) || tokens.length === 0) return { tokens: [], perTokenLogProbByLine };

  // Group by line; each résumé line is independent prose, so we decode it on its own.
  const byLine = new Map();
  for (const token of tokens) {
    if (!byLine.has(token.lineNumber)) byLine.set(token.lineNumber, []);
    byLine.get(token.lineNumber).push(token);
  }

  for (const [lineNumber, lineTokens] of byLine.entries()) {
    lineTokens.sort((a, b) => a.wordIndex - b.wordIndex);
    const observations = lineTokens.map((t) => t.normalized);
    const predictedRoles = englishSyntaxHMM.predict(observations, functionWords);

    lineTokens.forEach((token, i) => {
      const reasons = Array.isArray(token.reasons) ? token.reasons : [];
      // Same guard as the verse pass: targeted precursor evidence outranks the coarse HMM.
      const refined =
        reasons.includes("noun_precursor_context") || reasons.includes("verb_precursor_context");
      if (!refined && predictedRoles[i]) token.role = predictedRoles[i];
    });

    perTokenLogProbByLine.set(
      lineNumber,
      perTokenPathLogProb(englishSyntaxHMM, observations, lineTokens.map((t) => t.role), functionWords),
    );
  }

  return { tokens, perTokenLogProbByLine };
}

/**
 * Public entry point: analyze résumé text for legibility (prose vs. keyword-stuffing).
 *
 * @param {string} text
 * @returns {ReturnType<typeof buildAtsArbiterSummary>}
 */
export function analyzeResumeLegibility(text) {
  const tokens = tokenizeResume(text);
  const { perTokenLogProbByLine } = runAtsHmmPass(tokens, ATS_FUNCTION_WORDS);
  return buildAtsArbiterSummary(tokens, perTokenLogProbByLine);
}
