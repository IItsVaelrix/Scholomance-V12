/**
 * PB-CHROMA v2 — a colour stamp that can be read.
 *
 * v1 (`PB-CHROMA-<hue3><sat2><lit2><nucleus>`) was write-only: minted in three
 * places, parsed nowhere, and byte-identical whether the phonemes behind it came
 * from a dictionary or from a spelling guess. No macrophage could exist, because
 * there was no antigen to read.
 *
 * v2 carries the provenance and the commit decision:
 *
 *   PB-CHROMA-v2-{authority}{chef}{reason}{conf2}-{hue3}{sat2}{lit2}{nucleus}
 *
 *   authority  D O C G U X   see chroma.authority.js
 *   chef       P S Q A N     which resolver cooked it — a chef cannot claim to be another
 *   reason     K M I L       committed / missing substrate / invalid reaction / low confidence
 *   conf2      confidence x100, two hex digits (00..64)
 *
 * Every token gets a stamp, painted or grey. A grey token with a stamp is the
 * whole point: it declares whether it is honestly grey (nothing rhymed) or sick
 * (the authority was never there).
 *
 * Pure module: no fs, no DOM, no clock, no network.
 */

export const CHROMA_BYTECODE_PREFIX = 'PB-CHROMA';
export const CHROMA_BYTECODE_VERSION = 2;

export const CHROMA_CHEFS = Object.freeze({
  PCA: 'P',        // resolveVerseIrColor — PCA -> OKLCh
  SONIC: 'S',      // resolveSonicChroma — vowel wheel -> HSL
  QUANTIZER: 'Q',  // ChromaQuantizer
  AMPLIFIER: 'A',  // verseir-amplifier/plugins/phoneticColor
  NONE: 'N'        // nothing was committed
});

export const CHROMA_REASONS = Object.freeze({
  COMMITTED: 'K',
  MISSING_SUBSTRATE: 'M',
  INVALID_REACTION: 'I',
  LOW_CONFIDENCE: 'L'
});

const AUTHORITIES = new Set(['D', 'O', 'C', 'G', 'U', 'X']);
const CHEFS = new Set(Object.values(CHROMA_CHEFS));
const REASONS = new Set(Object.values(CHROMA_REASONS));

const NO_NUCLEUS = '__';

const hex = (value, width) => {
  const safe = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  return safe.toString(16).padStart(width, '0').slice(-width);
};

export function encodeChromaBytecode({ authority, chef, reason, confidence, h, s, l, nucleus }) {
  const conf = hex(Math.round((Number.isFinite(confidence) ? confidence : 0) * 100), 2);
  const payload = `${authority}${chef}${reason}${conf}`;
  const colour = `${hex(h, 3)}${hex(s, 2)}${hex(l, 2)}${nucleus || NO_NUCLEUS}`;
  return `${CHROMA_BYTECODE_PREFIX}-v${CHROMA_BYTECODE_VERSION}-${payload}-${colour}`;
}

const V2_RE = /^PB-CHROMA-v2-([A-Z])([A-Z])([A-Z])([0-9a-f]{2})-([0-9a-f]{3})([0-9a-f]{2})([0-9a-f]{2})(.+)$/;

/**
 * @returns {object|null} null for v1, malformed input, or an unknown symbol —
 * never a guess. A decoder that invents a provenance is the disease, not the cure.
 */
export function decodeChromaBytecode(value) {
  if (typeof value !== 'string') return null;

  const match = V2_RE.exec(value);
  if (!match) return null;

  const [, authority, chef, reason, conf, hueHex, satHex, litHex, nucleusRaw] = match;
  if (!AUTHORITIES.has(authority) || !CHEFS.has(chef) || !REASONS.has(reason)) return null;

  return {
    version: CHROMA_BYTECODE_VERSION,
    authority,
    chef,
    reason,
    confidence: parseInt(conf, 16) / 100,
    h: parseInt(hueHex, 16),
    s: parseInt(satHex, 16),
    l: parseInt(litHex, 16),
    nucleus: nucleusRaw === NO_NUCLEUS ? null : nucleusRaw,
    committed: reason === CHROMA_REASONS.COMMITTED
  };
}
