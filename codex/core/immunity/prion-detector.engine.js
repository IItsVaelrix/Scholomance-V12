/**
 * PRION DETECTOR
 *
 * A prion is a structural pattern that LOOKS like normal code but carries a defect:
 * a `catch` with no rethrow, an `addEventListener` with no cleanup, an `async` call
 * with no `await`. It is defined by PRESENCE plus ABSENCE.
 *
 * ── Why this is NOT the vector probe ──────────────────────────────────────────
 * Prion mode used to score with cosine similarity against a bag-of-words
 * "hypothesis". That cannot work, and it failed in the worst possible way: cosine
 * treats every token as evidence FOR a match, so a hypothesis listing the token
 * that must be MISSING ("...silent swallow throw rethrow") scores healthy code
 * ABOVE the bug. Measured on a minimal fixture — a swallowed `catch` versus the
 * same function with a proper rethrow:
 *
 *     42.4%  CURE_rethrows.js      <- correct code
 *      0.1%  PRION_swallowed.js    <- the actual defect
 *
 * It preferred the cure to the disease by 400x. Similarity is the wrong instrument
 * for a pattern whose definition contains a negation. You cannot express "must NOT
 * contain X" as a direction in vector space.
 *
 * ── The model ─────────────────────────────────────────────────────────────────
 * Each prion declares:
 *   anchor   — the token that MUST be present; every candidate window is centred here
 *   requires — additional tokens that must ALL appear in the window
 *   forbids  — tokens that must NOT appear; ANY of them ⇒ this is healthy code, score 0
 *
 * The window approximates "the same scope" as a span of characters around the
 * anchor. It is a heuristic, not a parser: a `throw` further away than the window
 * will be missed. Widen `windowChars` for a prion whose cure may live further off.
 */

const DEFAULT_WINDOW_CHARS = 600;

/** Same tokenization the code-aware lens uses: camelCase split, lowercased. */
function tokenizeWindow(text) {
  return new Set(
    String(text || '')
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(Boolean),
  );
}

function findAnchorOffsets(content, anchor) {
  const offsets = [];
  const needle = anchor.toLowerCase();
  const hay = content.toLowerCase();
  let i = hay.indexOf(needle);
  while (i !== -1) {
    offsets.push(i);
    i = hay.indexOf(needle, i + 1);
  }
  return offsets;
}

/**
 * Score ONE window. Returns 0 (healthy) or a confidence in (0, 1].
 *
 * The score is the fraction of `requires` present. It is hard-zeroed the moment any
 * `forbids` token appears — a cure anywhere in scope means this is not a prion, and
 * no amount of matching evidence should outvote that. That hard zero is the whole
 * point: it is the thing cosine similarity structurally cannot do.
 */
function scoreWindow(windowTokens, prion) {
  for (const forbidden of prion.forbids ?? []) {
    if (windowTokens.has(forbidden)) return 0;
  }
  const requires = prion.requires ?? [];
  if (requires.length === 0) return 1;

  let hits = 0;
  for (const token of requires) if (windowTokens.has(token)) hits += 1;
  return hits / requires.length;
}

function escapeRe(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function lineOf(content, index) {
  return content.slice(0, index).split('\n').length;
}

/**
 * PAIRED-CALL prion: `register(KEY)` appears and `unregister(KEY)` never does.
 *
 * This exists because the token-set rule is too coarse for leaks. Scanning for
 * "addEventListener without removeEventListener" as bare tokens returned ZERO hits
 * on a codebase where exactly that bug had just been fixed — because a NEARBY
 * listener's cleanup masked the missing one. CombatArenaScene registers a dozen
 * listeners and removes most of them; the one it forgot (`equipment-changed`) was
 * invisible to a rule that only asks "does the word removeEventListener appear?"
 *
 * The real invariant is per-KEY, so we capture the key and look for ITS cure:
 *
 *   addEventListener('equipment-changed', ...)   present
 *   removeEventListener('equipment-changed', ..) ABSENT   -> prion
 *
 * Scope is the whole file: cleanup legitimately lives far from registration (in a
 * `return () => …`, a `destroy()`, or an `events.once('destroy')` handler).
 *
 * @param {Array<{path: string, content: string}>} files
 * @param {{ registerRe: RegExp, cure: string, description?: string }} prion
 *   registerRe MUST have the /g flag and exactly one capture group (the key).
 * @returns {Array<{path: string, confidence: number, line: number, key: string, evidence: string}>}
 */
export function scanForPairedCallPrion(files, prion) {
  const hits = [];

  for (const file of files) {
    const content = file.content || '';
    const seen = new Set();
    // Fresh regex per file: /g regexes carry lastIndex across calls.
    const registerRe = new RegExp(prion.registerRe.source, prion.registerRe.flags);

    let match = registerRe.exec(content);
    while (match !== null) {
      const key = match[1];
      if (key && !seen.has(key)) {
        seen.add(key);

        // An INLINE cure at the call site. Without this the rule fires on listeners
        // that clean themselves up, which is not a defect:
        //   addEventListener('ended', fn, { once: true })   <- removes itself after firing
        // Measured: this alone accounted for 2 of 5 false positives on this codebase.
        const callSite = content.slice(match.index, match.index + (prion.exemptWindow ?? 160));
        if (prion.exemptRe && prion.exemptRe.test(callSite)) {
          match = registerRe.exec(content);
          continue;
        }

        // ALIASABLE handles: a timer/rAF handle is a VALUE and is routinely reassigned
        // (`const cId = setInterval(...); refs.current[i] = cId; ... refs.current.forEach(clearInterval)`).
        // We cannot follow that without dataflow analysis, so for those prions the mere
        // presence of the cure symbol anywhere in the file is treated as "cannot prove a
        // leak" and we stay silent. An EVENT NAME, by contrast, is a string literal and
        // never aliased — so for listeners the per-key check is exact and stays strict.
        // This is the difference between a rule that is precise and one that cries wolf.
        if (prion.aliasable && new RegExp(`\\b${escapeRe(prion.cure)}\\b`).test(content)) {
          match = registerRe.exec(content);
          continue;
        }

        // Does the CURE for THIS key appear anywhere in the file?
        const cureRe = new RegExp(`${escapeRe(prion.cure)}\\s*\\(\\s*['"\`]?${escapeRe(key)}['"\`]?`);
        if (!cureRe.test(content)) {
          hits.push({
            path: file.path,
            confidence: 1,
            line: lineOf(content, match.index),
            key,
            evidence: content.slice(match.index, match.index + 70).replace(/\s+/g, ' ').trim(),
          });
        }
      }
      match = registerRe.exec(content);
    }
  }

  return hits.sort((a, b) => a.path.localeCompare(b.path) || a.line - b.line);
}

/**
 * @param {Array<{path: string, content: string}>} files
 * @param {{anchor: string, requires?: string[], forbids?: string[], windowChars?: number}} prion
 * @param {{minConfidence?: number}} [options]
 * @returns {Array<{path: string, confidence: number, line: number, evidence: string}>}
 */
export function scanForPrion(files, prion, options = {}) {
  const minConfidence = options.minConfidence ?? 1;
  const windowChars = prion.windowChars ?? DEFAULT_WINDOW_CHARS;
  const half = Math.floor(windowChars / 2);
  const hits = [];

  for (const file of files) {
    const content = file.content || '';
    let best = 0;
    let bestOffset = -1;

    for (const offset of findAnchorOffsets(content, prion.anchor)) {
      const window = content.slice(Math.max(0, offset - half), offset + half);
      const score = scoreWindow(tokenizeWindow(window), prion);
      if (score > best) {
        best = score;
        bestOffset = offset;
      }
    }

    if (best >= minConfidence && bestOffset >= 0) {
      const line = content.slice(0, bestOffset).split('\n').length;
      const evidence = content
        .slice(bestOffset, content.indexOf('\n', bestOffset) + 1 || bestOffset + 80)
        .trim()
        .slice(0, 80);
      hits.push({ path: file.path, confidence: best, line, evidence });
    }
  }

  return hits.sort((a, b) => b.confidence - a.confidence || a.path.localeCompare(b.path));
}
