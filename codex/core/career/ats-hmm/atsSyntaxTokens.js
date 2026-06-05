/**
 * ATS résumé tokenizer (forked from codex/core/shared/syntax.layer.js).
 *
 * WHY A FORK: the verse syntax layer classifies tokens with `stressRole` and
 * `rhymePolicy` derived from CMU `deepPhonetics` — signals a résumé does not have and
 * does not want. This is the prose-only counterpart: same content/function + line-role +
 * precursor-context logic, with all rhyme/stress/phoneme machinery removed and a couple
 * of ATS-relevant signals (numeric "metric" tokens) added.
 *
 * It produces tokens shaped for `englishSyntaxHMM.predict` (the SHARED, verse-free core
 * we reuse — never forked) and for the ATS arbiter summary builder.
 *
 * Pure and deterministic: no clocks, no randomness, no network, no phonetics.
 */

/**
 * English closed-class function words. Copied verbatim from the verse syntax layer so the
 * HMM's dictionary-grounded emissions behave identically — function words are universal
 * English, so this is a value the two domains genuinely share rather than a coupling.
 */
export const ATS_FUNCTION_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "if", "then", "else", "than",
  "i", "me", "my", "mine", "you", "your", "yours", "we", "us", "our", "ours",
  "he", "him", "his", "she", "her", "hers", "they", "them", "their", "theirs",
  "it", "its", "this", "that", "these", "those",
  "am", "is", "are", "was", "were", "be", "been", "being",
  "do", "does", "did", "have", "has", "had", "done",
  "to", "of", "in", "on", "at", "for", "from", "with", "by", "as",
  "not", "no", "so", "too", "very", "just", "can", "could", "would", "should",
  "will", "shall", "might", "may", "must", "across", "against", "among", "around",
  "before", "behind", "below", "beside", "between", "beyond", "during", "over",
  "under", "until", "while", "within", "into", "onto", "per", "via", "etc",
]);

// Lexical triggers that flip an otherwise-ambiguous token to a content word, mirroring
// the verse layer's precursor refinement (e.g. "the will" → "will" is a noun, not modal).
const VERB_TRIGGERS = new Set(["to", "will", "would", "shall", "should", "can", "could", "must", "may", "might"]);
const NOUN_TRIGGERS = new Set(["the", "a", "an", "this", "that", "these", "those", "my", "your", "his", "her", "its", "our", "their", "every", "each", "some", "any"]);

// Leading résumé bullet glyphs, stripped before word-indexing so a bullet's first real
// word is recognized as the line's launch position (where the action verb belongs).
const BULLET_PREFIX_RE = /^[\s•·‣◦▪◦*\-–—]+/;

/** Lowercase + strip edge punctuation, preserving internal hyphens/apostrophes. */
function normalizeToken(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^[^a-z0-9']+|[^a-z0-9']+$/g, "");
}

/**
 * Minimal, self-contained suffix stemmer. Only used to detect adjacent-token repetition
 * ("chain" stuffing), so it deliberately under-stems rather than risk false merges. Local
 * to this module so the codex/core layer takes no dependency on the src/lib career utils.
 */
function lightStem(normalized) {
  let s = normalized;
  for (const suffix of ["ing", "edly", "ed", "ies", "es", "s"]) {
    if (s.length - suffix.length >= 3 && s.endsWith(suffix)) {
      return suffix === "ies" ? `${s.slice(0, -3)}y` : s.slice(0, -suffix.length);
    }
  }
  return s;
}

/** A token carries a "metric" signal if it encodes a number, percentage, or count. */
function isMetricToken(normalized) {
  return /\d/.test(normalized);
}

/**
 * Tokenizes raw résumé text into HMM-ready tokens, one pass per physical line so that
 * line-leading verb position and per-line legibility can be judged independently (each
 * bullet is its own clause).
 *
 * @param {string} text
 * @returns {Array<{
 *   word: string, normalized: string, stem: string,
 *   lineNumber: number, wordIndex: number,
 *   role: 'content'|'function', lineRole: 'line_start'|'line_mid'|'line_end',
 *   isMetric: boolean, reasons: string[]
 * }>}
 */
export function tokenizeResume(text) {
  const lines = String(text || "").split(/\r?\n/);
  const tokens = [];

  lines.forEach((rawLine, lineNumber) => {
    const line = rawLine.replace(BULLET_PREFIX_RE, "");
    const rawWords = line.split(/\s+/).filter(Boolean);

    // Pre-normalize and drop tokens that normalize to nothing (pure punctuation) so the
    // word index reflects real words — the HMM and line-role logic need contiguous words.
    const words = rawWords
      .map((w) => ({ word: w, normalized: normalizeToken(w) }))
      .filter((w) => w.normalized.length > 0);

    words.forEach((w, wordIndex) => {
      const prevNorm = wordIndex > 0 ? words[wordIndex - 1].normalized : "";
      const reasons = ["initial_heuristic_judgment"];

      let role = ATS_FUNCTION_WORDS.has(w.normalized) ? "function" : "content";
      if (prevNorm && NOUN_TRIGGERS.has(prevNorm)) {
        reasons.push("noun_precursor_context");
        role = "content";
      } else if (prevNorm && VERB_TRIGGERS.has(prevNorm)) {
        reasons.push("verb_precursor_context");
        role = "content";
      }

      let lineRole = "line_mid";
      if (wordIndex === 0 && words.length === 1) lineRole = "line_end";
      else if (wordIndex === 0) lineRole = "line_start";
      else if (wordIndex === words.length - 1) lineRole = "line_end";

      tokens.push({
        word: w.word,
        normalized: w.normalized,
        stem: lightStem(w.normalized),
        lineNumber,
        wordIndex,
        role,
        lineRole,
        isMetric: isMetricToken(w.normalized),
        reasons,
      });
    });
  });

  return tokens;
}
