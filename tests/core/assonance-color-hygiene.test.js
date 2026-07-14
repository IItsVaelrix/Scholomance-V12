import { describe, expect, it } from 'vitest';
import { DeepRhymeEngine } from '../../codex/core/rhyme-astrology/deepRhyme.engine.js';
import { PhonemeEngine } from '../../codex/core/phonology/phoneme.engine.js';
import { buildSelfDictionaryAPI } from '../../codex/server/adapters/selfDictionary.authority.js';

// ── Assonance colour-hygiene probe ──────────────────────────────────────────
// Question under test: does assonance contribute to colour misattribution by
// promoting slant rhymes that barely exist (or don't exist) into
// truesight-coloured connections?
//
// Verified mechanics (2026-06-11):
// - Pure stressed assonance scores a flat 0.62 (STRESSED_ASSONANCE_SCORE) and
//   is classified 'assonance', which pushConnectionIfValid ALWAYS filters out
//   (TRUESIGHT_RHYME_TYPES excludes it; syntax multipliers max at 1.0 so 0.62
//   can never reach the 0.66 slant threshold). That hygiene HOLDS — section A.
// - The real leak is inside scoreMultiSyllableMatch: a final syllable's score
//   is vowel*0.60 + coda*0.40, and two OPEN syllables get the full 0.40 coda
//   credit for free (getArraySimilarity([], []) === 1). Combined with
//   stress-blindness, an unstressed final "-y" perfect-matches a stressed
//   monosyllable (tree/happy => 1.00 PERFECT at document level) — assonance
//   wearing a perfect-rhyme costume. Section B documents these via it.fails.
// - Cross-family vowel similarity (free/day 0.82, go/law 0.91 — both above
//   the coloured-slant threshold) is held back ONLY by exact-family bucket
//   enumeration. Section C pins that guard and the latent unit-level scores.
// - Classic nasal-coda slants (time/line, home/stone) are rescued from the
//   final-coda gate as honest slant rhymes, while unrelated coda mismatches
//   stay filtered as assonance. Section D pins that boundary.

const engine = new DeepRhymeEngine();

// This probe is only meaningful against authoritative rhyme families. Unprimed,
// DeepRhymeEngine's dictionary lookup falls back to `fetch`, which has no origin
// under Node; words then never land in a shared family bucket and are never
// compared. That silently HID the section-B leak — "happy" reported zero perfect
// connections not because the engine is clean but because it never looked.
const dictionaryAPI = buildSelfDictionaryAPI();

async function analyze(text) {
  const words = text.match(/[A-Za-z']+/g) || [];
  await PhonemeEngine.primeAuthorityBatch(words, dictionaryAPI);
  await engine.primeRhymeFamilies(words, dictionaryAPI);
  return engine.analyzeDocument(text);
}

const SLANT_MIN = 0.66; // RHYME_TYPES.SLANT.minScore — colouring threshold
const NEAR_MIN = 0.78;

async function connectionBetween(text, a, b) {
  const result = await analyze(text);
  return result.allConnections.find(
    (c) =>
      (c.wordA.word.toLowerCase() === a && c.wordB.word.toLowerCase() === b) ||
      (c.wordA.word.toLowerCase() === b && c.wordB.word.toLowerCase() === a),
  ) || null;
}

function unitScore(a, b) {
  return PhonemeEngine.scoreMultiSyllableMatch(
    PhonemeEngine.analyzeDeep(a),
    PhonemeEngine.analyzeDeep(b),
  );
}

describe('A. assonance hygiene that holds (regression pins)', () => {
  it.each([
    ['faith', 'pain', 'I kept my faith\nI felt the pain'],
    ['blood', 'sun', 'covered in blood\nstaring at the sun'],
  ])('stressed assonance %s/%s emits a connection at 0.50 threshold', async (a, b, verse) => {
    const conn = await connectionBetween(verse, a, b);
    expect(conn).not.toBeNull();
    expect(conn.score).toBeGreaterThanOrEqual(0.50);
  });

  it('true perfect rhymes are picked up', async () => {
    const conn = await connectionBetween('I lost my mind\nthe world is blind', 'mind', 'blind');
    expect(conn).not.toBeNull();
    expect(conn.type).toBe('perfect');
  });

  it('assonance connections are emitted at 0.50 threshold', async () => {
    const assonanceRich = [
      'I kept my faith and felt the pain',
      'the light of time decays',
      'blood under the sun above',
      'hated waiting making faces',
    ].join('\n');
    const result = await analyze(assonanceRich);
    const assonanceConnections = result.allConnections.filter(conn => conn.type === 'assonance');
    expect(assonanceConnections.length).toBeGreaterThan(0);
    for (const conn of assonanceConnections) {
      expect(conn.score).toBeGreaterThanOrEqual(0.50);
    }
  });
});

describe('B. live misattribution (documented bugs — it.fails flips when fixed)', () => {
  // FIXED 2026-07-14 — was it.fails, now a passing regression pin.
  //
  // "happy" (HH AE1 P IY0) used to be emitted as a PERFECT rhyme with "sat"
  // (S AE1 T) at 0.92 — a word that shares one stressed vowel and nothing else.
  // The cause was not the stress-blind scoreMultiSyllableMatch after all: the
  // engine typed a connection PERFECT whenever the dictionary reported a shared
  // `rhyme_family`, and rhyme_family is the bare VOWEL family. Every AE word was
  // therefore a "perfect rhyme" with every other AE word, at exactly
  // RHYME_TYPES.PERFECT.minScore.
  //
  // Perfect now requires identical rhyme DOMAINS (the phoneme tail from the last
  // stressed vowel). happy is AE-PIY, sat is AE-T, tree is IY-open — three
  // different domains, so neither pairing can claim the strong tier. Both are
  // now assonance (sat 0.62, tree 0.65), which is exactly what they are.
  it('"happy" forms no perfect connection with any open monosyllable', async () => {
    const result = await analyze('I sat beneath the tree\nthe child was so happy');
    const touchingHappy = result.allConnections.filter(
      (c) => c.wordA.word.toLowerCase() === 'happy' || c.wordB.word.toLowerCase() === 'happy',
    );

    expect(touchingHappy.filter((c) => c.type === 'perfect')).toHaveLength(0);

    // Present, but correctly demoted to the quiet tier rather than dropped.
    expect(touchingHappy.length).toBeGreaterThan(0);
    for (const conn of touchingHappy) {
      expect(conn.type).toBe('assonance');
    }
  });

  // Without a syntax layer, bare function words used to connect as perfect
  // rhymes (I/my: open AY syllables). The engine now guards both-function
  // pairs directly so colour does not depend on the optional syntax layer.
  it('function words I/my should not form a perfect connection without a syntax layer', async () => {
    const conn = await connectionBetween('I kept my faith\nI felt the pain', 'i', 'my');
    expect(conn).toBeNull();
  });
});

describe('C. latent cross-family leak — held back only by bucket enumeration', () => {
  it('unit scorer rates cross-family open-syllable pairs above the colouring threshold', () => {
    // These pairs share NO vowel family — their similarity comes purely from
    // the vowel-similarity matrix plus the free 0.40 open-coda credit.
    // If candidate enumeration ever crosses families, they become coloured.
    expect(unitScore('free', 'day').score).toBeGreaterThanOrEqual(SLANT_MIN); // measured 0.820
    expect(unitScore('go', 'law').score).toBeGreaterThanOrEqual(NEAR_MIN);   // measured 0.910
  });

  it.each([
    ['free', 'day', 'at last I am free\nuntil the day'],
    ['go', 'law', 'I let it go\nagainst the law'],
  ])('document pipeline does NOT emit %s/%s (exact-family buckets are the only guard)', async (a, b, verse) => {
    expect(await connectionBetween(verse, a, b)).toBeNull();
  });
});

describe('D. genuine nasal-coda slant rhymes are visible without reopening assonance leaks', () => {
  // The final-coda gate now rescues single nasal-coda substitutions such as
  // M/N. That admits classic slants while keeping broader same-vowel coda
  // mismatches below the colouring threshold.
  it.each([
    ['time', 'line', 'I ran out of time\nI wrote one more line'],
    ['home', 'stone', 'so far from home\ncold as a stone'],
  ])('classic slant %s/%s emits a connection', async (a, b, verse) => {
    const conn = await connectionBetween(verse, a, b);
    expect(conn).not.toBeNull();
    expect(conn.score).toBeGreaterThanOrEqual(0.50);
  });

  it('unit scorer rescues classic nasal-coda slants', () => {
    expect(unitScore('time', 'line').score).toBeGreaterThanOrEqual(SLANT_MIN);
    expect(unitScore('home', 'stone').score).toBeGreaterThanOrEqual(SLANT_MIN);
  });
});
