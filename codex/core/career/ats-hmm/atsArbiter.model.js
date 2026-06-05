/**
 * ATS legibility arbiter (forked from codex/core/shared/models/harkov.model.js).
 *
 * WHY A FORK: the verse "Hidden Harkov" summary builder infers prosodic hidden states
 * (terminal_anchor, stress_anchor, function_gate) and weights tokens by `stressRole` and
 * `rhymePolicy` across PHONEME/METER/rhyme stages. None of that describes a résumé. This
 * builder keeps the same shape — per-token hidden states, per-line aggregation, a
 * deterministic summary — but its states and stages judge ONE thing: does this line read
 * as natural prose, or as a keyword-stuffed noun pile that an ATS and a human both reject.
 *
 * It is the "arbiter" in the pipeline: the keyword-gap analyzer judges relevance, this
 * judges legibility. Pure and deterministic — takes tokens + a precomputed per-line HMM
 * log-likelihood and returns a verdict. It never calls the model itself.
 *
 * ── CALIBRATION HONESTY ────────────────────────────────────────────────────────────
 * The thresholds below are HAND-PICKED heuristics, not learned from a labelled résumé
 * corpus. They reliably separate obvious stuffing (zero/near-zero function words, long
 * unbroken content runs) from ordinary prose, and the per-line `legibilityScore` gives a
 * stable RELATIVE ranking. Treat absolute verdicts as advisory until calibrated; trust
 * the ordering (stuffed lines always rank below natural ones) more than the cutoffs.
 */

// Healthy English prose runs ~30–45% function words; bullets are denser but still glued
// by prepositions/conjunctions. Stuffing collapses toward 0%.
const HEALTHY_FUNCTION_RATIO = 0.32;
// Consecutive content words tolerated before a line looks like a noun pile.
const RUN_TOLERANCE = 3;
const RUN_SPAN = 6; // content-run length over which runFit decays to 0
// Per-token Viterbi log-prob range, mapped to a 0..1 "the model finds this likely" fit.
const LOGPROB_FLOOR = -6.0; // improbable (stuffing / unknown emissions)
const LOGPROB_CEIL = -0.4; // fluent content/function alternation
// Blend of the three independent signals into one score.
const W_EMISSION = 0.5;
const W_FUNCTION = 0.3;
const W_RUN = 0.2;
// Verdict cutoffs on the blended 0..1 score.
const STUFFED_THRESHOLD = 0.45;
const DENSE_THRESHOLD = 0.65;
// Lines shorter than this are headings/fragments — scored but never flagged as stuffing.
const MIN_SCOREABLE_TOKENS = 4;
// Hard stuffing rule: an unbroken content run this long, on a line with almost no connective
// words, is unambiguously a keyword pile / missing-boundary line. We flag it directly rather
// than relying on the blended score, whose emission term stays high for content runs. The run
// floor (6) keeps it off ordinary noun-dense bullets, which thread in prepositions sooner.
const STUFFED_RUN_MIN = 6;
const HARD_STUFFED_FUNCTION_RATIO = 0.15;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Per-token hidden state — the ATS analogue of the verse model's prosodic states.
 */
function inferAtsHiddenState(token, prevToken) {
  if (token.role === "function") return "connector";
  if (token.isMetric) return "metric"; // quantification — the strongest résumé signal
  if (token.lineRole === "line_start") return "action_launch"; // bullet-leading verb slot
  if (prevToken && prevToken.stem && token.stem && prevToken.stem === token.stem) {
    return "chain_repeat"; // adjacent repetition — a redundancy / stuffing tell
  }
  return "skill_token";
}

/** Longest run of consecutive content-role tokens in a line. */
function longestContentRun(lineTokens) {
  let best = 0;
  let cur = 0;
  for (const t of lineTokens) {
    if (t.role === "content") {
      cur += 1;
      if (cur > best) best = cur;
    } else {
      cur = 0;
    }
  }
  return best;
}

/** Maps a per-token log-probability into a 0..1 "fluency" fit. */
function emissionFitFromLogProb(perTokenLogProb) {
  if (!Number.isFinite(perTokenLogProb)) return 0;
  return clamp((perTokenLogProb - LOGPROB_FLOOR) / (LOGPROB_CEIL - LOGPROB_FLOOR), 0, 1);
}

function verdictFromScore(score) {
  if (score < STUFFED_THRESHOLD) return "keyword_stuffed";
  if (score < DENSE_THRESHOLD) return "dense";
  return "legible";
}

/**
 * Builds the ATS arbiter summary.
 *
 * @param {Array<object>} tokens - from tokenizeResume, with HMM-refined `role`.
 * @param {Map<number, number>} perTokenLogProbByLine - line number → per-token Viterbi
 *        log-likelihood, computed by the pass against the shared HMM.
 * @returns {{
 *   model: 'ats_legibility_arbiter',
 *   legibilityScore: number,
 *   tokenCount: number,
 *   lines: Array<object>,
 *   flagged: Array<object>,
 *   tokenStateByIdentity: Map<string, object>,
 * }}
 */
export function buildAtsArbiterSummary(tokens, perTokenLogProbByLine = new Map()) {
  const tokenStateByIdentity = new Map();

  const ordered = (Array.isArray(tokens) ? tokens : [])
    .filter((t) => t && typeof t === "object")
    .slice()
    .sort((a, b) =>
      a.lineNumber !== b.lineNumber ? a.lineNumber - b.lineNumber : a.wordIndex - b.wordIndex,
    );

  // Group into lines, assigning hidden states as we go.
  const lineBuckets = new Map();
  for (let i = 0; i < ordered.length; i += 1) {
    const token = ordered[i];
    const prevToken =
      i > 0 && ordered[i - 1].lineNumber === token.lineNumber ? ordered[i - 1] : null;
    const hiddenState = inferAtsHiddenState(token, prevToken);
    const identity = `${token.lineNumber}:${token.wordIndex}`;
    tokenStateByIdentity.set(identity, { hiddenState, role: token.role, isMetric: token.isMetric });

    if (!lineBuckets.has(token.lineNumber)) lineBuckets.set(token.lineNumber, []);
    lineBuckets.get(token.lineNumber).push({ ...token, hiddenState });
  }

  const lines = [];
  let weightedScoreSum = 0;
  let weightSum = 0;

  for (const [lineNumber, lineTokens] of [...lineBuckets.entries()].sort((a, b) => a[0] - b[0])) {
    const tokenCount = lineTokens.length;
    const functionCount = lineTokens.filter((t) => t.role === "function").length;
    const metricCount = lineTokens.filter((t) => t.isMetric).length;
    const chainRepeats = lineTokens.filter((t) => t.hiddenState === "chain_repeat").length;
    const functionRatio = tokenCount > 0 ? functionCount / tokenCount : 0;
    const contentRun = longestContentRun(lineTokens);
    const hasLaunchVerb = tokenCount > 0 && lineTokens[0].role === "content";
    const perTokenLogProb = perTokenLogProbByLine.get(lineNumber);

    const emissionFit = emissionFitFromLogProb(perTokenLogProb);
    const functionFit = clamp(functionRatio / HEALTHY_FUNCTION_RATIO, 0, 1);
    const runFit = clamp(1 - Math.max(0, contentRun - RUN_TOLERANCE) / RUN_SPAN, 0, 1);
    const legibilityScore = clamp(
      W_EMISSION * emissionFit + W_FUNCTION * functionFit + W_RUN * runFit,
      0,
      1,
    );

    const scoreable = tokenCount >= MIN_SCOREABLE_TOKENS;
    // A long content run with near-zero connective tissue is a keyword pile regardless of the
    // blended score (the HMM emission term alone can't tell a noun pile from dense prose).
    const hardStuffed =
      scoreable && contentRun >= STUFFED_RUN_MIN && functionRatio < HARD_STUFFED_FUNCTION_RATIO;
    const verdict = !scoreable
      ? "fragment"
      : hardStuffed
        ? "keyword_stuffed"
        : verdictFromScore(legibilityScore);

    const lineSummary = {
      lineNumber,
      text: lineTokens.map((t) => t.word).join(" "),
      tokenCount,
      verdict,
      legibilityScore: Number(legibilityScore.toFixed(4)),
      signals: {
        functionRatio: Number(functionRatio.toFixed(4)),
        longestContentRun: contentRun,
        hasLaunchVerb,
        metricCount,
        chainRepeats,
        perTokenLogProb: Number.isFinite(perTokenLogProb) ? Number(perTokenLogProb.toFixed(4)) : null,
        emissionFit: Number(emissionFit.toFixed(4)),
        functionFit: Number(functionFit.toFixed(4)),
        runFit: Number(runFit.toFixed(4)),
      },
    };
    lines.push(lineSummary);

    if (scoreable) {
      weightedScoreSum += legibilityScore * tokenCount;
      weightSum += tokenCount;
    }
  }

  const legibilityScore = weightSum > 0 ? Number((weightedScoreSum / weightSum).toFixed(4)) : 1;
  const flagged = lines.filter((l) => l.verdict === "keyword_stuffed");

  return {
    model: "ats_legibility_arbiter",
    legibilityScore,
    tokenCount: ordered.length,
    lines,
    flagged,
    tokenStateByIdentity,
  };
}
