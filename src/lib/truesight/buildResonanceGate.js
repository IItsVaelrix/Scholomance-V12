/**
 * buildResonanceGate — turns resolved resonance connections into the tiered
 * coloring gate.
 *
 * The gate is ONE Map keyed by source-relative charStart, valued by a tier:
 *
 *   'rhyme'      — the strong tier: full school color + glow. A non-assonance
 *                  connection scoring at/above the rhyme bar (MIN_RESONANCE_SCORE),
 *                  exactly the set of words that colored before this change.
 *   'assonance'  — the quiet tier: soft school tint, no glow. A type:'assonance'
 *                  connection (vowel echo). Fully represented, but subordinate so
 *                  it reads as a palette rather than skittles noise.
 *
 * Rhyme wins: a charStart that participates in both tiers is 'rhyme'.
 *
 * Returning a Map (not a Set) keeps `.has`/`.size` working for existing gate
 * consumers while adding `.get(charStart)` for the tier. Pure function — no
 * React, no DOM, no module state.
 *
 * @param {Array} connections - from resolveResonanceConnections().connections
 * @param {{ minResonanceScore?: number }} [opts]
 * @returns {Map<number, 'rhyme' | 'assonance'>}
 */
export const RHYME_TIER = 'rhyme';
export const ASSONANCE_TIER = 'assonance';
export const DEFAULT_MIN_RESONANCE_SCORE = 0.95;
// Only true word-rhyme connection types drive the rhyme (glow) tier. Notably
// this EXCLUDES `phrase_compound` (multi-token phrase windows — they belong to
// the highlight overlay, not per-word coloring, and otherwise flood the gate to
// ~68% of the document) and `consonance` (too weak to read as resonance).
export const RHYME_TIER_TYPES = new Set(['identity', 'perfect', 'near', 'slant']);
// Assonance tints only solid vowel echoes. The weak band (below this) is the
// long tail of incidental same-vowel pairs that read as noise rather than
// resonance, so it is left grey. Tuned against a representative dense verse to
// keep assonance from over-representing the palette.
export const DEFAULT_ASSONANCE_MIN_SCORE = 0.60;

export function buildResonanceGate(connections, opts = {}) {
  const minResonanceScore = typeof opts.minResonanceScore === 'number'
    ? opts.minResonanceScore
    : DEFAULT_MIN_RESONANCE_SCORE;
  const assonanceMinScore = typeof opts.assonanceMinScore === 'number'
    ? opts.assonanceMinScore
    : DEFAULT_ASSONANCE_MIN_SCORE;

  const gate = new Map();
  if (!Array.isArray(connections)) return gate;

  for (const c of connections) {
    const score = Number(c?.score) || 0;

    // Assonance tier: a type:'assonance' vowel echo that clears the assonance
    // floor (weak echoes are left grey to avoid over-coloring). Otherwise a
    // connection at or above the historical bar is the strong rhyme tier.
    const isAssonanceType = c?.type === ASSONANCE_TIER;

    let tier = null;
    if (isAssonanceType) {
      if (score >= assonanceMinScore) tier = ASSONANCE_TIER;
    } else if (RHYME_TIER_TYPES.has(c?.type) && score >= minResonanceScore) {
      tier = RHYME_TIER;
    }
    if (!tier) continue;

    for (const cs of [c?.wordA?.charStart, c?.wordB?.charStart]) {
      if (!Number.isFinite(cs)) continue;
      if (tier === RHYME_TIER) {
        gate.set(cs, RHYME_TIER); // rhyme always wins
      } else if (gate.get(cs) !== RHYME_TIER) {
        gate.set(cs, ASSONANCE_TIER);
      }
    }
  }

  return gate;
}
