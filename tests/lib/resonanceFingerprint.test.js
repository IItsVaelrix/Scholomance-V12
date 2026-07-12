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
    expect(compareResonanceByBlocks(fp('LIGHT'), fp('NIGHT')).relationship).toBe('MUTATION');
    expect(compareResonanceByBlocks(fp('DESIRE'), fp('BANANA')).relationship).toBe('WEAK_NEIGHBOR');
  });

  it('a fingerprint is IDENTICAL to itself', () => {
    expect(compareResonanceByBlocks(fp('FIRE'), fp('FIRE')).relationship).toBe('IDENTICAL');
  });
});
