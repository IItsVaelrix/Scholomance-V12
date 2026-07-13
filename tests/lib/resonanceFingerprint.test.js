import { describe, expect, it } from 'vitest';
import {
  buildResonanceFingerprint,
  parseResonanceBlocks,
  compareResonanceByBlocks,
  areRhymeCandidates,
  RESONANCE_VERSION_BYTE,
} from '../../codex/core/rhyme-astrology/resonanceFingerprint.js';

const W = {
  FIRE:   ['F', 'AY1', 'ER0'],
  DESIRE: ['D', 'IH0', 'Z', 'AY1', 'ER0'],
  HIGHER: ['HH', 'AY1', 'ER0'],
  SIN:    ['S', 'IH1', 'N'],
  SIM:    ['S', 'IH1', 'M'],
  OLD:    ['OW1', 'L', 'D'],
  OWED:   ['OW1', 'D'],
  WORLD:  ['W', 'ER1', 'L', 'D'],
  HERD:   ['HH', 'ER1', 'D'],
  BRIGHT: ['B', 'R', 'AY1', 'T'],
  LIGHT:  ['L', 'AY1', 'T'],
  NIGHT:  ['N', 'AY1', 'T'],
  STONE:  ['S', 'T', 'OW1', 'N'],
  BONE:   ['B', 'OW1', 'N'],
  THRONE: ['TH', 'R', 'OW1', 'N'],
  CREATE: ['K', 'R', 'IY0', 'EY1', 'T'],
  ELATE:  ['IH0', 'L', 'EY1', 'T'],
  BANANA: ['B', 'AH0', 'N', 'AE1', 'N', 'AH0'],
  GLOW:   ['G', 'L', 'OW1'],
  // GOLDEN: append-shear pairs from tests/core/phonology/golden_rhymes.test.js.
  // CODALAST alone shears these apart (differing FINAL coda phoneme); CODAFIRST
  // (nucleus + FIRST coda phoneme) is what makes them collide.
  LINE:     ['L', 'AY1', 'N'],
  MIND:     ['M', 'AY1', 'N', 'D'],
  SWEATY:   ['S', 'W', 'EH1', 'T', 'IY0'],
  HEAVY:    ['HH', 'EH1', 'V', 'IY0'],
  ALREADY:  ['AO0', 'L', 'R', 'EH1', 'D', 'IY0'],
  SPAGHETTI: ['S', 'P', 'AH0', 'G', 'EH1', 'T', 'IY0'],
  BASTARD:  ['B', 'AE1', 'S', 'T', 'ER0', 'D'],
  MASTER:   ['M', 'AE1', 'S', 'T', 'ER0'],
  SUNLIGHT: ['S', 'AH1', 'N', 'L', 'AY2', 'T'],
};
const fp = (w) => buildResonanceFingerprint(W[w]);

describe('fingerprint shape', () => {
  it('is 64 uppercase hex characters', () => {
    expect(fp('FIRE')).toMatch(/^[0-9A-F]{64}$/);
  });

  it('splits into 8 blocks of 8', () => {
    const blocks = parseResonanceBlocks(fp('FIRE'));
    expect(blocks).toHaveLength(8);
    expect(blocks.every((b) => b.length === 8)).toBe(true);
  });

  it('exposes the R1 version byte', () => {
    // The version tag is carried inside the VERSION slot's canonical string
    // (hashed like every other slot) rather than spliced as a raw prefix onto
    // block 0: 'R1' is not valid hex ('R' is outside [0-9A-F]), so prepending
    // it literally would corrupt block 0 and break the 64-hex invariant that
    // parseResonanceBlocks enforces on every fingerprint.
    expect(RESONANCE_VERSION_BYTE).toBe('R1');
  });

  it('is deterministic', () => {
    expect(fp('DESIRE')).toBe(fp('DESIRE'));
  });

  it('returns null for a token with no rhyme tail', () => {
    expect(buildResonanceFingerprint([])).toBeNull();
  });
});

// A MISSED candidate is invisible forever and can never be emitted.
// A FALSE candidate merely gets rejected later by scoreMultiSyllableMatch.
// Recall failures are therefore far more serious than precision failures.
describe('areRhymeCandidates — recall (must never miss)', () => {
  const MUST = [
    ['FIRE', 'DESIRE'], ['FIRE', 'HIGHER'],   // r-coloured tails
    ['SIN', 'SIM'],                            // slant coda: differ only in `place`
    ['OLD', 'OWED'], ['WORLD', 'HERD'],        // coda-length shear
    ['BRIGHT', 'LIGHT'], ['LIGHT', 'NIGHT'],
    ['STONE', 'BONE'], ['BONE', 'THRONE'],
    ['CREATE', 'ELATE'],                       // hiatus
    // GOLDEN (tests/core/phonology/golden_rhymes.test.js): append-shear pairs
    // where CODALAST alone misses (differing FINAL coda phoneme) but
    // CODAFIRST (nucleus + FIRST coda phoneme) collides them.
    ['LINE', 'MIND'], ['SWEATY', 'HEAVY'],
    ['ALREADY', 'SPAGHETTI'], ['BASTARD', 'MASTER'],
  ];
  it.each(MUST)('%s ~ %s are candidates', (a, b) => {
    expect(areRhymeCandidates(fp(a), fp(b))).toBe(true);
  });
});

describe('areRhymeCandidates — precision', () => {
  const MUST_NOT = [
    ['DESIRE', 'BANANA'], ['FIRE', 'GLOW'],
    ['SIN', 'BANANA'], ['BRIGHT', 'BANANA'],
  ];
  it.each(MUST_NOT)('%s ~ %s are NOT candidates', (a, b) => {
    expect(areRhymeCandidates(fp(a), fp(b))).toBe(false);
  });
});

describe('compareResonanceByBlocks — the block count grades the rhyme', () => {
  it('rates a perfect rhyme above a slant rhyme, and both above a non-rhyme', () => {
    const perfect = compareResonanceByBlocks(fp('LIGHT'), fp('NIGHT')).matchingBlocks;
    const slant   = compareResonanceByBlocks(fp('SIN'), fp('SIM')).matchingBlocks;
    const none    = compareResonanceByBlocks(fp('DESIRE'), fp('BANANA')).matchingBlocks;
    expect(perfect).toBeGreaterThan(slant);
    expect(slant).toBeGreaterThan(none);
  });

  it('uses the same relationship tiers as src/core/scd64/compareSCD64.ts', () => {
    // LIGHT/NIGHT is IDENTICAL, not MUTATION, now that ONSET has been dropped
    // from the slot set (CODAFIRST fix): an onset is irrelevant to rhyme, so
    // once it stops being a block, two tokens with the exact same tail truly
    // have nothing left to differ on. SUNLIGHT/LIGHT — same tail, but SUNLIGHT
    // carries an extra stressed syllable earlier in the word — is the MUTATION
    // example instead: everything derived from the tail matches, only STRESS
    // (a whole-word count, not tail-derived) differs, landing at 7/8.
    expect(compareResonanceByBlocks(fp('LIGHT'), fp('NIGHT')).relationship).toBe('IDENTICAL');
    expect(compareResonanceByBlocks(fp('SUNLIGHT'), fp('LIGHT')).relationship).toBe('MUTATION');
    expect(compareResonanceByBlocks(fp('DESIRE'), fp('BANANA')).relationship).toBe('WEAK_NEIGHBOR');
  });

  it('a fingerprint is IDENTICAL to itself', () => {
    expect(compareResonanceByBlocks(fp('FIRE'), fp('FIRE')).relationship).toBe('IDENTICAL');
  });
});
