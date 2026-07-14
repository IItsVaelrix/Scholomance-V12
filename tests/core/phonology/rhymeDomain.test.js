/**
 * The rhyme domain formula.
 *
 *   i* = max { i : pi is a vowel ∧ stress(pi) ∈ {1,2} }
 *        (no such i → i* = max { i : pi is a vowel })
 *   RhymeDomain(P) = stripStress( P[i* .. n] )
 *   A rhymes with B ⟺ RhymeDomain(A) = RhymeDomain(B) ∧ A ≠ B
 *
 * These cases are not examples chosen to make the code pass — each one is a
 * consequence of a clause of the formula, and each was a REAL false rhyme
 * shipped to users before it existed.
 */

import { describe, expect, it } from 'vitest';
import {
  buildRhymeKey,
  isPerfectRhyme,
  rhymeDomain,
  slantRhymeKeys,
  substitutableCodas,
  terminalVowelFamily,
} from '../../../codex/core/phonology/rhymeDomain.js';

const P = {
  // monosyllables — the cases the old key got right by accident
  bold: ['B', 'OW1', 'L', 'D'],
  told: ['T', 'OW1', 'L', 'D'],
  hand: ['HH', 'AE1', 'N', 'D'],
  love: ['L', 'AH1', 'V'],
  move: ['M', 'UW1', 'V'],
  blood: ['B', 'L', 'AH1', 'D'],
  food: ['F', 'UW1', 'D'],
  good: ['G', 'UH1', 'D'],
  song: ['S', 'AO1', 'NG'],
  eye: ['AY1'],
  tree: ['T', 'R', 'IY1'],
  // polysyllables — the cases it got wrong
  repulsive: ['R', 'IY0', 'P', 'AH1', 'L', 'S', 'IH0', 'V'],
  understood: ['AH2', 'N', 'D', 'ER0', 'S', 'T', 'UH1', 'D'],
  morning: ['M', 'AO1', 'R', 'N', 'IH0', 'NG'],
  fire: ['F', 'AY1', 'ER0'],
  happy: ['HH', 'AE1', 'P', 'IY0'],
  // secondary stress on the final element
  broadband: ['B', 'R', 'AO1', 'D', 'B', 'AE2', 'N', 'D'],
  lifetime: ['L', 'AY1', 'F', 'T', 'AY2', 'M'],
  time: ['T', 'AY1', 'M'],
};

describe('[Core] rhyme domain', () => {
  it('starts the domain at the last stressed vowel, not the first', () => {
    // "understood" is stressed AH2 ... UH1. The domain begins at UH1.
    expect(rhymeDomain(P.understood)).toEqual(['UH', 'D']);
    expect(rhymeDomain(P.blood)).toEqual(['AH', 'D']);
    expect(isPerfectRhyme(P.understood, P.blood)).toBe(false);
  });

  it('carries every phoneme after the onset, not just the final coda', () => {
    // The old key took the family from one syllable and the coda from another,
    // so "repulsive" (…IH0 V) keyed AH-V and collided with "love" (AH V).
    expect(rhymeDomain(P.repulsive)).toEqual(['AH', 'L', 'S', 'IH', 'V']);
    expect(rhymeDomain(P.love)).toEqual(['AH', 'V']);
    expect(isPerfectRhyme(P.repulsive, P.love)).toBe(false);

    expect(rhymeDomain(P.morning)).toEqual(['AO', 'R', 'N', 'IH', 'NG']);
    expect(isPerfectRhyme(P.morning, P.song)).toBe(false);
  });

  it('keeps distinct vowels distinct (the love/move, blood/food collapse)', () => {
    expect(isPerfectRhyme(P.love, P.move)).toBe(false); // AH vs UW
    expect(isPerfectRhyme(P.blood, P.food)).toBe(false); // AH vs UW
    expect(isPerfectRhyme(P.blood, P.good)).toBe(false); // AH vs UH
  });

  it('counts SECONDARY stress, so compounds rhyme on their final element', () => {
    // Not an exception — stress(AE2) ∈ {1,2}, so the domain starts there.
    expect(rhymeDomain(P.broadband)).toEqual(['AE', 'N', 'D']);
    expect(isPerfectRhyme(P.broadband, P.hand)).toBe(true);

    expect(rhymeDomain(P.lifetime)).toEqual(['AY', 'M']);
    expect(isPerfectRhyme(P.lifetime, P.time)).toBe(true);
  });

  it('excludes stress 0, so an unstressed syllable cannot anchor a rhyme', () => {
    // "happy" HH AE1 P IY0 — the throwaway "-y" must not rhyme with "tree".
    // This is the misattribution pinned in assonance-color-hygiene.test.js.
    expect(rhymeDomain(P.happy)).toEqual(['AE', 'P', 'IY']);
    expect(rhymeDomain(P.tree)).toEqual(['IY']);
    expect(isPerfectRhyme(P.happy, P.tree)).toBe(false);
  });

  it('does not swallow a trailing unstressed vowel into the coda', () => {
    // "fire" is F AY1 ER0. The old coda logic dropped ER0 (a vowel), keying
    // AY-open — identical to "eye".
    expect(rhymeDomain(P.fire)).toEqual(['AY', 'ER']);
    expect(rhymeDomain(P.eye)).toEqual(['AY']);
    expect(isPerfectRhyme(P.fire, P.eye)).toBe(false);
  });

  it('holds the true rhymes it is supposed to find', () => {
    expect(isPerfectRhyme(P.bold, P.told)).toBe(true);
    expect(isPerfectRhyme(P.hand, P.broadband)).toBe(true);
  });

  it('is not reflexive: a word does not rhyme with itself by this predicate alone', () => {
    // The predicate is domain equality; callers exclude identity (the SQL says
    // `word_lower != ?`). Domain equality with itself is trivially true, so the
    // identity guard is the CALLER's job — pin that expectation here.
    expect(isPerfectRhyme(P.bold, P.bold)).toBe(true);
  });

  it('emits a <family>-<rest> key so existing consumers keep parsing', () => {
    expect(buildRhymeKey(P.bold)).toBe('OW-LD');
    expect(buildRhymeKey(P.hand)).toBe('AE-ND');
    expect(buildRhymeKey(P.broadband)).toBe('AE-ND');
    expect(buildRhymeKey(P.eye)).toBe('AY-open'); // rhyme ends on its nucleus
    expect(buildRhymeKey(P.love)).toBe('AH-V');
    expect(buildRhymeKey(P.move)).toBe('UW-V');

    // truesightColor derives the school hue from the prefix; it must be the
    // family the rhyme is BUILT on, so a rhyme group shares one colour.
    expect(terminalVowelFamily(P.broadband)).toBe(terminalVowelFamily(P.hand));
  });

  it('degrades safely on garbage input rather than inventing a rhyme', () => {
    expect(rhymeDomain([])).toEqual([]);
    expect(rhymeDomain(null)).toEqual([]);
    expect(buildRhymeKey([])).toBeNull();
    expect(buildRhymeKey(['B', 'L'])).toBeNull(); // no vowel at all
    expect(isPerfectRhyme(['B', 'L'], ['B', 'L'])).toBe(false);
  });
});

/**
 * The SECOND near-rhyme axis. A slant moves either the nucleus or the coda:
 *
 *   nucleus:  blood (AH·D) ~ good (UH·D)          — already supported
 *   coda:     believe (IY·V) ~ Socrates (IY·Z)    — was unreachable
 *
 * The coda axis is the most common slant move in rap, and rhyme_key had no path
 * for it. The dictionary's own coda_groups could not provide one either: they are
 * PLACE-based voicing pairs (F:[F,V], S:[S,Z]), so V lives in the F group and Z in
 * the S group and the two never meet.
 */
describe('[Core] coda substitution (near-rhyme axis 2)', () => {
  const BELIEVE = ['B', 'IH0', 'L', 'IY1', 'V'];
  const SOCRATES = ['S', 'AA1', 'K', 'R', 'AH0', 'T', 'IY2', 'Z'];
  const BOLD = ['B', 'OW1', 'L', 'D'];
  const EYE = ['AY1'];

  it('lets voiced fricatives stand in for one another', () => {
    // V, DH, Z, ZH are one manner+voicing class. This is the believe/Socrates move.
    const forV = substitutableCodas('V');
    expect(forV).toEqual(expect.arrayContaining(['Z', 'DH', 'ZH']));
    expect(substitutableCodas('Z')).toContain('V');
  });

  it('also allows the voicing counterpart, which is a separate real move', () => {
    expect(substitutableCodas('V')).toContain('F'); // leave ~ leaf
    expect(substitutableCodas('D')).toContain('T'); // bold ~ bolt
  });

  it('never substitutes across manner: a stop is not a fricative', () => {
    expect(substitutableCodas('D')).not.toContain('Z');
    expect(substitutableCodas('V')).not.toContain('B');
  });

  it('reaches Socrates from believe — the case the taxonomy could not express', () => {
    expect(buildRhymeKey(BELIEVE)).toBe('IY-V');
    expect(buildRhymeKey(SOCRATES)).toBe('IY-Z');

    // Not a PERFECT rhyme: the keys differ, and they must keep differing.
    expect(isPerfectRhyme(BELIEVE, SOCRATES)).toBe(false);

    // But it IS a slant, and the key must now be reachable from believe.
    expect(slantRhymeKeys(BELIEVE)).toContain('IY-Z');
    expect(slantRhymeKeys(SOCRATES)).toContain('IY-V');
  });

  it('substitutes the final consonant and preserves the rest of the tail', () => {
    // "bold" OW-LD -> the L is kept, only the D moves: bolt (OW-LT).
    const keys = slantRhymeKeys(BOLD);
    expect(keys).toContain('OW-LT');
    expect(keys).not.toContain('OW-D');   // must not drop the L
    expect(keys).not.toContain('OW-LD');  // never the identity key
  });

  it('does not apply when the rhyme ends on its nucleus', () => {
    // "eye" is AY-open — there is no coda to substitute.
    expect(slantRhymeKeys(EYE)).toEqual([]);
    expect(slantRhymeKeys([])).toEqual([]);
  });
});

describe('[Core] rhyme domain — input safety', () => {
  it('degrades safely on garbage input rather than inventing a rhyme', () => {
    expect(rhymeDomain([])).toEqual([]);
    expect(rhymeDomain(null)).toEqual([]);
    expect(buildRhymeKey([])).toBeNull();
    expect(buildRhymeKey(['B', 'L'])).toBeNull(); // no vowel at all
    expect(isPerfectRhyme(['B', 'L'], ['B', 'L'])).toBe(false);
  });
});
