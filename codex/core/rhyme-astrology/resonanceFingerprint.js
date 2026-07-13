/**
 * The Resonance Fingerprint — one fixed-width code per token.
 *
 * A rhyme is a property each token holds INDEPENDENTLY (its tail), so the pair
 * is derivable and never needs storing. This is that property, in the SCD64
 * discipline already used across the codebase: 64 uppercase hex characters,
 * 8 blocks of 8, each block sha256(canonical).slice(0,8).
 *
 * Because a block is a hash of its canonical string, two fingerprints share a
 * block IF AND ONLY IF that canonical is identical. Sharing a block IS the
 * bucket — deterministic, with no probability involved. (An earlier SimHash /
 * TurboQuant design was measured and rejected: band collision is ~22% likely at
 * cosine 0.85, so real rhymes were missed at random, and a missed candidate can
 * never be emitted.)
 *
 * Block-match count grades the rhyme for free, on the SAME tiers as
 * src/core/scd64/compareSCD64.ts:
 *   7-8/8 MUTATION/IDENTICAL  perfect rhyme
 *   6/8   MUTATION            slant (SIN/SIM — differ only in `place`)
 *   4-5/8 RELATED_FAMILY      coda-length shear (OLD/OWED, WORLD/HERD)
 *   2-3/8 WEAK_NEIGHBOR       unrelated
 *
 * NOT imported from src/core/scd64: that is UI-layer TypeScript, and codex runs
 * under plain Node ESM with no TS loader. The discipline is reimplemented; the
 * thresholds are kept identical so the taxonomy does not fork.
 *
 * CODAFIRST — why the coda needs TWO anchors, not one.
 * CODALAST anchors on the coda's FINAL phoneme, which shears apart the moment
 * a consonant is APPENDED: LINE ends N, MIND ends N-D — CODALAST buckets
 * AY:N against AY:D and they miss, even though "line"/"mind" is a textbook
 * slant rhyme (Eminem: "palms are sweaty... moms spaghetti" is the same
 * shape — SWEATY's coda closes earlier than HEAVY's). The mirror failure
 * happens when a consonant is PREPENDED instead: OLD (OW-L-D) vs OWED
 * (OW-D) — there CODALAST still matches (both end D), but an anchor on the
 * FIRST coda phoneme would miss (L vs D). Neither anchor alone survives both
 * directions of coda-length shear, so CODAFIRST (nucleus + the coda's FIRST
 * phoneme) is carried alongside CODALAST: one absorbs append-shear, the
 * other absorbs prepend-shear, and a genuine rhyme only needs to survive one
 * of the two to bucket together. ONSET was removed to make room: an onset is
 * irrelevant to rhyme by definition (FIRE/DESIRE rhyme despite differing
 * onsets), so it was never pulling weight as a rhyme-bearing block.
 */
import crypto from 'node:crypto';
import { extractRhymeTail } from '../phonology/tailEmbedding.js';
import { PHONOLOGICAL_FEATURES_V1 } from '../phonology/phoneme.constants.js';

export const RESONANCE_SLOTS = Object.freeze([
  'TAIL',       // the exact rhyme tail            -> perfect rhyme
  'NUCLEUS',    // the stressed nucleus            -> assonance
  'CODALAST',   // nucleus + FINAL coda phoneme    -> append-shear (LINE/MIND)
  'CODACLASS',  // nucleus + coda manner/nasality  -> slant (SIN/SIM)
  'CODAFIRST',  // nucleus + FIRST coda phoneme    -> prepend-shear (OLD/OWED)
  'SYLLABLES',
  'STRESS',
  'VERSION',
]);

export const RESONANCE_VERSION_BYTE = 'R1';

// Blocks that carry rhyme identity. Sharing ANY of these makes two tokens
// candidates. NUCLEUS is deliberately NOT included: sharing only a vowel is
// assonance, not a rhyme, and it would bucket a third of the document together.
const RHYME_BEARING_BLOCKS = Object.freeze([0, 2, 3, 4]);

function hashBlock(canonical) {
  return crypto.createHash('sha256').update(canonical).digest('hex').toUpperCase().slice(0, 8);
}

/**
 * The coda-manner-class string for a single (last) coda phoneme, dropping
 * `place` ON PURPOSE: place is exactly what separates slant partners
 * (N/M, T/P). Keeping it would make SIN and SIM look unrelated. Exported so
 * callers outside the fixed-width fingerprint (deepRhyme.engine.js's
 * phrase-level vowel-slant bucketing) can reuse the exact same class
 * instead of re-deriving a second, possibly-drifting definition of it.
 */
export function codaClassOf(lastCodaPhoneme) {
  const features = lastCodaPhoneme ? PHONOLOGICAL_FEATURES_V1[lastCodaPhoneme] : null;
  return features ? `m${features.manner}n${features.nasality}` : 'open';
}

function buildCanonicals(phonemes) {
  const tail = extractRhymeTail(phonemes);
  if (!tail.length) return null;

  const nucleus = tail[0];
  const coda = tail.slice(1);
  const last = coda.length ? coda[coda.length - 1] : null;
  const first = coda.length ? coda[0] : null;
  const codaClass = codaClassOf(last);

  return {
    TAIL: `TAIL:${tail.join('-')}`,
    NUCLEUS: `NUC:${nucleus}`,
    CODALAST: `CL:${nucleus}:${last ?? 'open'}`,
    CODACLASS: `CC:${nucleus}:${codaClass}`,
    CODAFIRST: `CF:${nucleus}:${first ?? 'open'}`,
    SYLLABLES: `SYL:${tail.length}`,
    STRESS: `STR:${phonemes.filter((p) => /[12]/.test(String(p))).length}`,
    VERSION: `V:${RESONANCE_VERSION_BYTE}`,
  };
}

export function buildResonanceFingerprint(phonemes) {
  const canonicals = buildCanonicals(phonemes);
  if (!canonicals) return null;

  // Every slot, including VERSION, is a plain sha256 block. SCD64's BUGCLASS
  // convention prepends a literal version-byte prefix onto block 0, but that
  // prefix ('01', '02', ...) is itself valid hex there. 'R1' is not — 'R' is
  // outside [0-9A-F] — so prepending it here would corrupt the block-0 hash
  // into invalid hex, and parseResonanceBlocks (which compareResonanceByBlocks
  // and areRhymeCandidates both call) would then throw on EVERY fingerprint.
  // The version is still carried, just inside the VERSION slot's canonical
  // string (`V:R1`, hashed like everything else) rather than as a raw prefix.
  return RESONANCE_SLOTS.map((slot) => hashBlock(canonicals[slot])).join('');
}

export function parseResonanceBlocks(fingerprint) {
  if (typeof fingerprint !== 'string' || !/^[0-9A-F]{64}$/.test(fingerprint)) {
    throw new Error('[Resonance] fingerprints must be exactly 64 uppercase hex characters.');
  }
  return fingerprint.match(/.{8}/g) ?? [];
}

export function compareResonanceByBlocks(a, b) {
  const blocksA = parseResonanceBlocks(a);
  const blocksB = parseResonanceBlocks(b);

  let matchingBlocks = 0;
  const differentBlocks = [];
  for (let i = 0; i < 8; i += 1) {
    if (blocksA[i] === blocksB[i]) matchingBlocks += 1;
    else differentBlocks.push(RESONANCE_SLOTS[i]);
  }

  // Same thresholds as src/core/scd64/compareSCD64.ts — do not fork the taxonomy.
  let relationship;
  if (matchingBlocks === 8) relationship = 'IDENTICAL';
  else if (matchingBlocks >= 6) relationship = 'MUTATION';
  else if (matchingBlocks >= 4) relationship = 'RELATED_FAMILY';
  else if (matchingBlocks >= 2) relationship = 'WEAK_NEIGHBOR';
  else relationship = 'UNRELATED';

  return { matchingBlocks, differentBlocks, similarity: matchingBlocks / 8, relationship };
}

export function areRhymeCandidates(a, b) {
  if (!a || !b) return false;
  const blocksA = parseResonanceBlocks(a);
  const blocksB = parseResonanceBlocks(b);
  return RHYME_BEARING_BLOCKS.some((i) => blocksA[i] === blocksB[i]);
}

/**
 * The bucket keys for a fingerprint. Two tokens sharing ANY of these are
 * candidates. The slot index is prefixed so that an identical hex value landing
 * in two different slots can never collide by accident.
 */
export function rhymeBucketKeys(fingerprint) {
  if (!fingerprint) return [];
  const blocks = parseResonanceBlocks(fingerprint);
  return RHYME_BEARING_BLOCKS.map((i) => `${i}:${blocks[i]}`);
}
