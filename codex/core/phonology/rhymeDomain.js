/**
 * Rhyme Domain — the canonical, formulaic definition of where a rhyme begins.
 *
 * THE FORMULA
 * -----------
 * Given CMU ARPAbet phones P = [p1..pn], where every vowel carries a stress
 * digit s ∈ {0 unstressed, 1 primary, 2 secondary}:
 *
 *   i* = max { i : pi is a vowel ∧ stress(pi) ∈ {1,2} }
 *        if no such i exists:  i* = max { i : pi is a vowel }
 *
 *   RhymeDomain(P) = stripStress( P[i* .. n] )
 *
 *   A rhymes perfectly with B  ⟺  RhymeDomain(A) = RhymeDomain(B)  ∧  A ≠ B
 *
 * Total, deterministic, decidable. No thresholds, no scores, no judgement.
 *
 * WHY STRESS 0 IS EXCLUDED
 * ------------------------
 * An unstressed syllable cannot anchor a rhyme. Admitting stress-0 vowels is
 * what lets "happy" (HH AE1 P IY0) claim a PERFECT rhyme with "tree" (T R IY1)
 * on its throwaway final "-y" — the misattribution pinned in
 * tests/core/assonance-color-hygiene.test.js. Under this formula happy's domain
 * is AE P IY and tree's is IY, so they are correctly not a rhyme.
 *
 * WHY STRESS 2 IS INCLUDED
 * ------------------------
 * Not an anecdote — a consequence. Compounds carry their final element on
 * secondary stress: "broadband" is B R AO1 D B AE2 N D and "lifetime" is
 * L AY1 F T AY2 M. Their rhyme lives on that final stressed syllable. Anchoring
 * on primary stress alone would make broadband/hand and lifetime/time non-rhymes,
 * which is false. The rule is "stressed", and CMU spells stressed as {1,2}.
 *
 * WHAT THIS REPLACES
 * ------------------
 * rhymeKey used to be `${vowelFamily}-${coda}` where vowelFamily came from the
 * FIRST stressed syllable and coda came from the LAST syllable — two different
 * syllables stitched together. Correct for monosyllables by accident, garbage
 * otherwise:
 *
 *   repulsive  R IY0 P AH1 L S IH0 V  -> AH-V  (= love!)   should be AH-LSIHV
 *   understood AH2 N D ER0 S T UH1 D  -> AH-D  (= blood!)  should be UH-D
 *   morning    M AO1 R N IH0 NG       -> AO-NG (= song!)   should be AO-RNIHNG
 *
 * KEY FORMAT
 * ----------
 * `<family>-<rest>` is preserved so existing consumers (truesightColor's
 * familyFromRhymeKey, corpus /semantic, the phonology panel) keep parsing. The
 * difference is that BOTH halves now come from the rhyme domain instead of from
 * two unrelated syllables. Monosyllabic keys are unchanged (bold -> OW-LD), so
 * the words that were already right stay right.
 */

import { ARPABET_VOWELS, VOWEL_TO_BASE_FAMILY } from "./phoneme.constants.js";
import { normalizeVowelFamily } from "./vowelFamily.js";

const STRESSED = /[12]$/;

function isVowel(phone) {
  return ARPABET_VOWELS.has(String(phone).replace(/[0-9]/g, ""));
}

function stripStress(phone) {
  return String(phone).replace(/[0-9]/g, "");
}

/**
 * i* from the formula: the index at which the rhyme begins.
 * @returns {number} -1 when the input carries no vowel at all.
 */
export function findRhymeOnsetIndex(phones) {
  if (!Array.isArray(phones) || phones.length === 0) return -1;

  for (let i = phones.length - 1; i >= 0; i -= 1) {
    if (isVowel(phones[i]) && STRESSED.test(phones[i])) return i;
  }
  // Fully reduced word (every vowel is stress 0), e.g. many function words.
  for (let i = phones.length - 1; i >= 0; i -= 1) {
    if (isVowel(phones[i])) return i;
  }
  return -1;
}

/**
 * RhymeDomain(P): the stress-stripped phoneme tail two words must share to rhyme.
 * @returns {string[]} empty when the input carries no vowel.
 */
export function rhymeDomain(phones) {
  const onset = findRhymeOnsetIndex(phones);
  if (onset < 0) return [];
  return phones.slice(onset).map(stripStress);
}

/** The vowel family the rhyme is built on — the family of the domain's nucleus. */
export function terminalVowelFamily(phones) {
  const domain = rhymeDomain(phones);
  const nucleus = domain[0];
  if (!nucleus) return null;
  return normalizeVowelFamily(VOWEL_TO_BASE_FAMILY[nucleus] || nucleus || "A") || "A";
}

/**
 * The canonical rhyme key: `<family>-<rest of the domain>`, or `<family>-open`
 * when the rhyme ends on its nucleus ("eye" -> AY-open).
 *
 * Equality of this key IS the perfect-rhyme predicate.
 */
export function buildRhymeKey(phones) {
  const domain = rhymeDomain(phones);
  if (domain.length === 0) return null;
  const family = terminalVowelFamily(phones);
  const rest = domain.slice(1).join("");
  return `${family}-${rest || "open"}`;
}

/**
 * CODA SUBSTITUTION — the second near-rhyme axis.
 *
 * A slant rhyme moves along one of two axes, and the codebase only had the first:
 *
 *   1. NUCLEUS substitution — same coda, different vowel.
 *      blood (AH·D) ~ good (UH·D) ~ food (UW·D)
 *
 *   2. CODA substitution — same vowel, a NEIGHBOURING consonant.
 *      believe (IY·V) ~ Socrates (IY·Z),  leave (IY·V) ~ keys (IY·Z)
 *
 * Axis 2 is the most common slant move in rap and was unreachable: rhyme_key put
 * "believe" at IY-V and "Socrates" at IY-Z with nothing connecting them.
 *
 * The coda_groups table in public/phoneme_dictionary_v2.json cannot bridge it
 * either, because those groups are PLACE-based voicing pairs — F:[F,V], S:[S,Z] —
 * so V sits in the F group, Z sits in the S group, and they never meet. (Its
 * N:[N,NG,M] entry is inconsistent with the rest: that one IS a manner class.)
 *
 * Two consonants are substitutable when they share a MANNER+VOICING class (a
 * voiced fricative for a voiced fricative: V/DH/Z/ZH) or are each other's VOICING
 * counterpart (F/V, S/Z, T/D). Both relations are real slant moves; their union is
 * the substitution set.
 */
const MANNER_VOICING_CLASSES = [
  ['B', 'D', 'G'],            // voiced stops
  ['P', 'T', 'K'],            // unvoiced stops
  ['V', 'DH', 'Z', 'ZH'],     // voiced fricatives  <- believe/Socrates lives here
  ['F', 'TH', 'S', 'SH'],     // unvoiced fricatives
  ['CH', 'JH'],               // affricates
  ['M', 'N', 'NG'],           // nasals
  ['L', 'R'],                 // liquids
  ['W', 'Y'],                 // glides
];

const VOICING_PAIRS = [
  ['P', 'B'], ['T', 'D'], ['K', 'G'],
  ['F', 'V'], ['TH', 'DH'], ['S', 'Z'], ['SH', 'ZH'], ['CH', 'JH'],
];

const CONSONANT_SUBSTITUTIONS = (() => {
  const map = new Map();
  const add = (a, b) => {
    if (a === b) return;
    if (!map.has(a)) map.set(a, new Set());
    map.get(a).add(b);
  };
  for (const group of MANNER_VOICING_CLASSES) {
    for (const a of group) for (const b of group) add(a, b);
  }
  for (const [a, b] of VOICING_PAIRS) { add(a, b); add(b, a); }
  return map;
})();

/** Consonants that may stand in for `phone` in a near rhyme. */
export function substitutableCodas(phone) {
  const set = CONSONANT_SUBSTITUTIONS.get(stripStress(phone));
  return set ? [...set] : [];
}

/**
 * Rhyme keys that are CODA-SUBSTITUTION slants of these phones: same nucleus, the
 * final consonant swapped for a neighbour. Substituting only the final consonant
 * keeps the candidate set small and targets the most salient position — the one
 * the ear actually lands on.
 *
 * Returns [] when the rhyme ends on its nucleus ("eye" -> AY-open): there is no
 * coda to substitute, so this axis does not apply.
 */
export function slantRhymeKeys(phones) {
  const domain = rhymeDomain(phones);
  if (domain.length < 2) return [];

  const family = terminalVowelFamily(phones);
  const tail = domain.slice(1);
  const last = tail[tail.length - 1];
  const head = tail.slice(0, -1).join('');

  return substitutableCodas(last).map((sub) => `${family}-${head}${sub}`);
}

/** A rhymes perfectly with B. Identity is not a rhyme. */
export function isPerfectRhyme(phonesA, phonesB) {
  const a = rhymeDomain(phonesA);
  const b = rhymeDomain(phonesB);
  if (a.length === 0 || b.length === 0) return false;
  if (a.length !== b.length) return false;
  return a.every((p, i) => p === b[i]);
}
