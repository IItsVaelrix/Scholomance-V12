/**
 * The commit gate TrueSight never had.
 *
 * TrueSight paints unconditionally (`dom.style.color = this.__color`), so a
 * colour derived from guessed phonemes is painted with exactly the same
 * confidence as one derived from the dictionary. qbit-phosphorylation.js already
 * solved this shape for pixels: build a kinase, score a confidence, and either
 * commit or refuse with a TYPED REASON.
 *
 * We purpose the law, not the function body — `phosphorylate()` is welded to SDF
 * geometry (evaluateSDF, sdfGradient, setCell), and a token is not a pixel with a
 * signed distance.
 *
 * The refusal reason is the antigen. Every grey token declares why it is grey:
 *
 *   (none) healthy  — analysis ran, nothing rhymed
 *   L      sick     — the phonemes were guessed (API down, or flooded to the local path)
 *   I      broken   — malformed colour (#NaN)
 *   M      starved  — no phonemes at all
 *
 * Pure module: no fs, no DOM, no clock, no network.
 */

import { authorityForToken } from './chroma.authority.js';
import {
  CHROMA_CHEFS,
  CHROMA_REASONS,
  encodeChromaBytecode,
} from './chroma.bytecode.js';

/** Same bar as qbit-phosphorylation's COLLAPSE_THRESHOLD. 0.50 is refused; 0.51 commits. */
export const CHROMA_COLLAPSE_THRESHOLD = 0.51;

const HEX_COLOR_RE = /^#[0-9A-Fa-f]{6}$/;

/**
 * @param {object} token - an IR token carrying `phonemes` and `phoneticDiagnostics`.
 * @param {object} options
 * @param {string} options.chef - CHROMA_CHEFS value. The kinase stamps its own chef;
 *   a chef cannot claim to be another chef.
 * @param {Function} options.resolve - (token) => { hex, h, s, l, nucleus }. Injected, so
 *   the kinase decides whether a colour MAY be committed without knowing how to compute one.
 */
export function buildChromaKinase(token, { chef = CHROMA_CHEFS.NONE, resolve } = {}) {
  const authority = authorityForToken(token);
  const hasSubstrate = Array.isArray(token?.phonemes) && token.phonemes.length > 0;

  return {
    chef,
    authority,
    call() {
      if (!hasSubstrate) return { color: null, confidence: authority.confidence, nucleus: null };
      if (typeof resolve !== 'function') return { color: null, confidence: authority.confidence, nucleus: null };

      const resolved = resolve(token) || {};
      return {
        color: resolved.hex ?? null,
        confidence: authority.confidence,
        h: resolved.h,
        s: resolved.s,
        l: resolved.l,
        nucleus: resolved.nucleus ?? null,
      };
    },
  };
}

/**
 * Commits a colour, or refuses it with a reason.
 * @returns {{committed: boolean, color: string|null, confidence: number,
 *            reason: string, authority: string, chef: string, bytecode: string}}
 */
export function phosphorylateToken(token, kinase, options = {}) {
  const threshold = Number.isFinite(options.threshold) ? options.threshold : CHROMA_COLLAPSE_THRESHOLD;
  const authority = kinase?.authority || { letter: 'X', confidence: 0 };
  const chef = kinase?.chef || CHROMA_CHEFS.NONE;

  const stamp = (reason, result = {}) => {
    const committed = reason === CHROMA_REASONS.COMMITTED;
    return {
      committed,
      color: committed ? result.color : null,
      confidence: authority.confidence,
      reason,
      authority: authority.letter,
      chef,
      bytecode: encodeChromaBytecode({
        authority: authority.letter,
        chef,
        reason,
        confidence: authority.confidence,
        h: committed ? result.h : 0,
        s: committed ? result.s : 0,
        l: committed ? result.l : 0,
        nucleus: committed ? result.nucleus : null,
      }),
    };
  };

  let result;
  try {
    result = kinase.call();
  } catch {
    return stamp(CHROMA_REASONS.INVALID_REACTION);
  }

  // No phonemes: there is no surface to paint.
  if (!result || result.color === null) return stamp(CHROMA_REASONS.MISSING_SUBSTRATE, result);

  // A malformed colour is a broken reaction, not a weak one — report it as such
  // even when the authority would have been sufficient.
  if (!HEX_COLOR_RE.test(result.color)) return stamp(CHROMA_REASONS.INVALID_REACTION, result);

  // The colour is well-formed but unbacked. Refuse: painting it would be a lie.
  if (authority.confidence < threshold) return stamp(CHROMA_REASONS.LOW_CONFIDENCE, result);

  return stamp(CHROMA_REASONS.COMMITTED, result);
}
