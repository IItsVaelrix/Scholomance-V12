import { describe, expect, it } from 'vitest';
import { DeepRhymeEngine } from '../../codex/core/rhyme-astrology/deepRhyme.engine.js';
import { PhonemeEngine } from '../../codex/core/phonology/phoneme.engine.js';

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

const SLANT_MIN = 0.66; // RHYME_TYPES.SLANT.minScore — colouring threshold
const NEAR_MIN = 0.78;

async function connectionBetween(text, a, b) {
  const result = await engine.analyzeDocument(text);
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
    ['light', 'time', 'I saw the light\nI ran out of time'],
    ['blood', 'sun', 'covered in blood\nstaring at the sun'],
  ])('pure stressed assonance %s/%s never becomes a coloured connection', async (a, b, verse) => {
    expect(await connectionBetween(verse, a, b)).toBeNull();
  });

  it('true non-rhymes emit nothing', async () => {
    expect(await connectionBetween('I peeled an orange\nI hit the wall', 'orange', 'wall')).toBeNull();
  });

  it('true perfect rhymes are picked up', async () => {
    const conn = await connectionBetween('I lost my mind\nthe world is blind', 'mind', 'blind');
    expect(conn).not.toBeNull();
    expect(conn.type).toBe('perfect');
  });

  it('no emitted connection ever carries the assonance type (the 0.62 path is fully gated)', async () => {
    const assonanceRich = [
      'I kept my faith and felt the pain',
      'the light of time decays',
      'blood under the sun above',
      'hated waiting making faces',
    ].join('\n');
    const result = await engine.analyzeDocument(assonanceRich);
    for (const conn of result.allConnections) {
      expect(['perfect', 'near', 'slant', 'identity']).toContain(conn.type);
      expect(conn.score).toBeGreaterThanOrEqual(0.6);
    }
  });
});

describe('B. live misattribution (documented bugs — it.fails flips when fixed)', () => {
  // Open-syllable vowel-only matching scores a flat 1.00 PERFECT for the
  // final "-y" of "happy" against whichever open monosyllable shares its
  // analysed vowel family (dictionary analysis pairs it with "tree" via IY;
  // the heuristic G2P analyses "-y" as stressed AY and pairs it with "I").
  // Both partners have tiny real resonance with "happy", yet the connection
  // is emitted at the strongest type and coloured. Desired behaviour: no
  // perfect-type connection should touch "happy" in this verse.
  it.fails('"happy" should not form a perfect connection with any open monosyllable', async () => {
    const result = await engine.analyzeDocument('I sat beneath the tree\nthe child was so happy');
    const perfectHappy = result.allConnections.filter(
      (c) => c.type === 'perfect' &&
        (c.wordA.word.toLowerCase() === 'happy' || c.wordB.word.toLowerCase() === 'happy'),
    );
    expect(perfectHappy).toHaveLength(0);
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
  ])('classic slant %s/%s emits a slant connection', async (a, b, verse) => {
    const conn = await connectionBetween(verse, a, b);
    expect(conn).not.toBeNull();
    expect(conn.type).toBe('slant');
    expect(conn.score).toBeGreaterThanOrEqual(SLANT_MIN);
  });

  it('unit scorer rescues classic nasal-coda slants', () => {
    expect(unitScore('time', 'line').score).toBeGreaterThanOrEqual(SLANT_MIN);
    expect(unitScore('home', 'stone').score).toBeGreaterThanOrEqual(SLANT_MIN);
  });
});
