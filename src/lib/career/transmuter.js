/**
 * VerseIR Career Transmuter
 *
 * Maps low-torque verbs to stronger ATS action verbs.
 *
 * Replacement is a context-free `\bword\b` swap with no view of the object that
 * follows, so every value here MUST be object-agnostic: it has to read correctly
 * whether the bullet's object is a person, system, process, document, metric, or
 * relationship. That rules out narrow "power verbs" whose object type is fixed —
 * "Catalyzed" wants a reaction ("Catalyzed inquiries" is wrong), "Architected" wants
 * a system ("Architected rapport" is wrong), "Resonated" is intransitive, and so on.
 * Picking a broadly-transitive verb is what keeps a blind swap from producing a
 * verb-object mismatch, which reads as machine-generated and gets a résumé discarded.
 *
 * Two verbs are deliberately NOT mapped because no single replacement survives their
 * idiomatic forms: "followed" (→ "followed up", which any swap breaks into "<verb> up")
 * and "thought" (→ "thought leadership"). They stay literal, which is already résumé-safe.
 */

import { stem } from './text-utils.js';

// Exported (PDR §6 required upstream change) so the keyword-gap analyzer can detect
// torque conflicts — JD keywords this map would rewrite away — without duplicating the
// vocabulary. The analyzer reads it; it never mutates it.
export const TORQUE_MAP = {
  // WILL School (Leadership & Operations)
  "led": "Orchestrated",
  "managed": "Oversaw",
  "helped": "Facilitated",
  "started": "Initiated",
  "improved": "Enhanced",
  "handled": "Navigated",

  // ALCHEMY School (Engineering & Technical)
  "built": "Developed",
  "coded": "Engineered",
  "fixed": "Resolved",
  "used": "Leveraged",
  "tested": "Validated",
  "updated": "Revised",

  // PSYCHIC School (Design & UX)
  "designed": "Crafted",
  "created": "Produced",
  "made": "Generated",
  "drew": "Illustrated",

  // SONIC School (QA & Support)
  "checked": "Audited",
  "monitored": "Tracked",
  "supported": "Championed",
  "asked": "Queried",

  // VOID School (Security & Compliance)
  "secured": "Fortified",
  "blocked": "Nullified",
  "watched": "Tracked"
};

const SPECTRAL_ANCHORS = [
  "High-Fidelity",
  "Scalable Infrastructure",
  "Distributed Consensus",
  "Algorithmic Precision",
  "Linguistic Torque",
  "Syntactic Integrity",
  "Aura Calibration",
  "Resonance Optimization"
];

export const SIGIL_VERSION = "v11.3";
const SIGIL_HEADER = `--- SCHOLOMANCE CAREER SIGIL ${SIGIL_VERSION} ---`;
const SIGIL_FOOTER = "[BINDING COMPLETE]";
const RESONANCE_PREFIX = "CORE RESONANCE: Specialized in";

// Scaffolding strippers. Each is ANCHORED to the position the wrapper actually
// occupies — header at the very start, footer and resonance trailer at the very end —
// and is case-SENSITIVE. This is deliberate: a global, case-insensitive sweep would
// (a) delete legitimate body text that merely resembles a marker, and (b) break
// idempotency, because removing a mid-string match on one pass can let a header
// lookalike become start-anchored on the next. Version-tolerant on the header so an
// older Sigil still round-trips.
const SIGIL_HEADER_RE = /^\s*--- SCHOLOMANCE CAREER SIGIL [^\n]*? ---\s*/;
const SIGIL_FOOTER_RE = /\s*\[BINDING COMPLETE\]\s*$/;
const RESONANCE_TRAILER_RE = /\s*CORE RESONANCE: Specialized in[^\n]*\s*$/;

function djb2(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
  }
  return hash >>> 0;
}

// Characters that mark a clause boundary when they immediately precede a swapped verb:
// sentence terminators, a label colon ("Skills:"), and common résumé bullet glyphs.
const CLAUSE_BOUNDARY_CHARS = new Set(['.', '!', '?', ':', '•', '·', '‣', '◦', '*', '-', '–', '—']);

/**
 * Decides whether a match at `offset` begins a clause and therefore wants a capitalized
 * verb. TORQUE_MAP values are stored capitalized (the common case: a bullet-leading verb),
 * so we look back past horizontal whitespace and capitalize when the verb starts the
 * document, starts a line, or follows a sentence terminator / label colon / bullet glyph —
 * and lowercase it otherwise so mid-sentence swaps ("and oversaw the team") read naturally.
 */
function startsClause(text, offset) {
  let i = offset - 1;
  while (i >= 0 && (text[i] === ' ' || text[i] === '\t')) i--;
  if (i < 0) return true;                       // start of document
  const c = text[i];
  if (c === '\n' || c === '\r') return true;    // start of line
  return CLAUSE_BOUNDARY_CHARS.has(c);
}

/** Lowercases the first character of an otherwise-capitalized torque value. */
function decapitalize(word) {
  return word.charAt(0).toLowerCase() + word.slice(1);
}

/** 1-based line number of a character offset, for human-readable provenance entries. */
function lineNumberAt(text, offset) {
  let line = 1;
  for (let i = 0; i < offset && i < text.length; i += 1) {
    if (text[i] === '\n') line += 1;
  }
  return line;
}

/**
 * Removes this transmuter's own scaffolding (header at the start, footer and resonance
 * trailer at the end) so the transmuter is idempotent: transmuting an already-
 * transmuted Sigil reproduces the same output instead of nesting headers and stacking
 * resonance lines. Only top-and-tails the wrapper — never touches the body — so
 * marker-like text inside a resume survives untouched.
 */
function stripSigil(text) {
  return text
    .replace(SIGIL_HEADER_RE, '')      // header: start of string only
    .replace(SIGIL_FOOTER_RE, '')      // footer: end of string only
    .replace(RESONANCE_TRAILER_RE, ''); // resonance: end of string only
}

/**
 * Collapses runs of spaces/tabs while PRESERVING line structure. ATS parsers segment
 * resumes by line and section, so flattening newlines into spaces would destroy the
 * document we claim to optimize. Caps blank-line runs so the result stays stable
 * under repeated application.
 */
function normalizeWhitespace(text) {
  return text
    .replace(/[^\S\n]+/g, ' ')        // collapse spaces/tabs, leave newlines intact
    .replace(/[ \t]*\n[ \t]*/g, '\n') // trim horizontal space around newlines
    .replace(/\n{3,}/g, '\n\n')       // cap blank-line runs at one
    .trim();
}

/**
 * Deterministically selects `count` distinct anchors starting from a seeded offset.
 */
function pickAnchors(seed, count) {
  const total = SPECTRAL_ANCHORS.length;
  const picks = [];
  for (let i = 0; i < count && i < total; i++) {
    picks.push(SPECTRAL_ANCHORS[(seed + i) % total]);
  }
  return picks;
}

/**
 * Builds the set of stemmed terms the transmuter must leave literal. Stemming here
 * uses the SAME `stem` as the analyzer (PDR §12.6 note), so a JD keyword "managing"
 * preserves the torque key "managed" — they collapse to the identical stem.
 *
 * Returns an empty set for missing/empty input, which makes the default path (no
 * options) skip nothing and stay byte-identical to legacy output.
 */
function buildPreserveStemSet(preserveKeywords) {
  const set = new Set();
  if (!Array.isArray(preserveKeywords)) return set;
  for (const term of preserveKeywords) {
    if (typeof term !== 'string') continue;
    const cleaned = term.toLowerCase().trim();
    if (cleaned) set.add(stem(cleaned));
  }
  return set;
}

/**
 * Transmutes a raw string into an ATS-optimized 'Sigil' (Resume content).
 *
 * Deterministic and idempotent: the same input always yields the same Sigil, and
 * transmuting a Sigil yields that same Sigil unchanged.
 *
 * `options.preserveKeywords` (PDR §12.6) is an opt-in list of literal terms — typically
 * the JD keywords the keyword-gap analyzer flagged as torque conflicts — that must NOT
 * be swapped. Matching is by stem, so "managed" stays "managed" instead of becoming
 * "Catalyzed" and silently lowering the very match score we just measured. When the
 * option is absent the preserve set is empty and output is byte-identical to legacy.
 */
/**
 * Shared transmutation core. Produces both the Sigil string and an itemized changelog
 * ("provenance") of every transformation, so the public string-only and provenance APIs
 * stay byte-identical by construction. Internal — callers use the two exports below.
 *
 * @returns {{ sigil: string, changes: Array<object> }}
 */
function transmuteCore(text, options = {}) {
  if (!text) return { sigil: "", changes: [] };

  const preserve = buildPreserveStemSet(options.preserveKeywords);
  const changes = [];

  // 0. Strip any prior Sigil scaffolding so re-transmuting is idempotent.
  let optimized = stripSigil(String(text));

  // 1. Apply Torque Map (Word Replacement). Values are never themselves keys, so a
  //    single pass is stable. Skip any entry whose key the caller asked to preserve,
  //    keeping the literal JD keyword intact. Capitalization is position-aware: the
  //    stored (capitalized) value leads a clause, a lowercased variant runs mid-sentence.
  Object.entries(TORQUE_MAP).forEach(([low, high]) => {
    if (preserve.has(stem(low))) return; // keep the literal JD keyword
    const regex = new RegExp(`\\b${low}\\b`, 'gi');
    optimized = optimized.replace(regex, (matched, offset, full) => {
      const clauseLeading = startsClause(full, offset);
      const replacement = clauseLeading ? high : decapitalize(high);
      changes.push({
        type: 'verb_swap',
        from: matched,
        to: replacement,
        lineNumber: lineNumberAt(full, offset),
        capitalization: clauseLeading ? 'clause-leading' : 'mid-sentence',
        reason:
          `"${matched.toLowerCase()}" is a low-torque verb; elevated to the stronger, ` +
          `object-agnostic "${high}" for ATS impact` +
          (clauseLeading ? '.' : ' (kept lowercase — runs mid-sentence).'),
      });
      return replacement;
    });
  });

  // 2. Clean up syntax (newline-preserving) BEFORE seeding so the resonance anchor is
  //    computed from stable, normalized content.
  optimized = normalizeWhitespace(optimized);

  // Content that is empty or only whitespace/scaffolding yields no Sigil, consistent
  // with the falsy-input guard above — we never emit a ceremonial empty artifact.
  if (!optimized) return { sigil: "", changes: [] };

  // 3. Infuse anchors (keywords). Count scales with content length: short inputs get one,
  //    fuller resumes up to three. When the caller supplies `resonanceAnchors` (the
  //    pipeline derives these from JD-matched skills), we use those REAL, on-domain terms
  //    and drop the ceremonial tail. With no anchors supplied we fall back to the generic
  //    SPECTRAL_ANCHORS in the legacy format — byte-identical to pre-JD output.
  const seed = djb2(optimized);
  const anchorCount = Math.min(3, 1 + Math.floor(optimized.length / 500));
  const customAnchors = Array.isArray(options.resonanceAnchors)
    ? options.resonanceAnchors.filter((a) => typeof a === 'string' && a.trim()).map((a) => a.trim())
    : null;
  const usingJdAnchors = Boolean(customAnchors && customAnchors.length > 0);
  const anchorList = usingJdAnchors ? customAnchors.slice(0, anchorCount) : pickAnchors(seed, anchorCount);
  const anchors = anchorList.join(', ');
  optimized += usingJdAnchors
    ? `\n\n${RESONANCE_PREFIX} ${anchors}.`
    : `\n\n${RESONANCE_PREFIX} ${anchors} and Systemic Calibration.`;
  changes.push({
    type: 'anchor_infusion',
    anchors: anchorList,
    source: usingJdAnchors ? 'jd_matched' : 'fallback_generic',
    lineNumber: null,
    reason: usingJdAnchors
      ? `Appended ${anchorList.length} keyword anchor(s) drawn from skills present in BOTH your ` +
        `experience and the target job description — reinforcing genuine matches for ATS scans.`
      : `Appended ${anchorList.length} generic anchor(s) because no JD-matched keywords were ` +
        `available to derive from. These are placeholders — replace or remove before sending.`,
  });

  // 4. Format into the pseudo-ATS structure.
  return { sigil: `${SIGIL_HEADER}\n\n${optimized}\n\n${SIGIL_FOOTER}`, changes };
}

export function transmuteToSigil(text, options = {}) {
  return transmuteCore(text, options).sigil;
}

/**
 * Same transmutation as {@link transmuteToSigil}, but also returns an itemized changelog
 * of every transformation — the data behind the UI "Data Archive". The `sigil` is
 * byte-identical to `transmuteToSigil(text, options)`.
 *
 * @returns {{ sigil: string, changes: Array<{type: string, reason: string} & object> }}
 */
export function transmuteToSigilWithProvenance(text, options = {}) {
  return transmuteCore(text, options);
}

/**
 * Whether the current runtime can perform a browser file download. Exported so
 * callers (and tests) can branch instead of triggering a thrown guard.
 */
export function canGenerateSigilFile() {
  return (
    typeof document !== 'undefined' &&
    typeof Blob !== 'undefined' &&
    typeof URL !== 'undefined' &&
    typeof URL.createObjectURL === 'function'
  );
}

/**
 * Generates a downloadable file blob and triggers a browser download.
 *
 * This is the module's only DOM-coupled function; the transmutation logic above is
 * pure and runtime-agnostic. Fails loud with a clear message in non-browser runtimes
 * (workers, SSR, bare Node) rather than throwing a cryptic ReferenceError on `document`.
 * Returns the filename used.
 */
export function generateSigilFile(content, filename = "career_sigil.txt") {
  if (!canGenerateSigilFile()) {
    throw new Error(
      'generateSigilFile requires a browser environment (document + URL.createObjectURL).'
    );
  }

  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return filename;
}
