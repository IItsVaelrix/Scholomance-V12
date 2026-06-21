import { describe, it, expect } from 'vitest';
import { Syllabifier } from '../../codex/core/phonology/syllabifier.js';
import { VOWEL_TO_BASE_FAMILY } from '../../codex/core/phonology/phoneme.constants.js';
import { normalizeVowelFamily } from '../../codex/core/phonology/vowelFamily.js';

// The authoritative color key, exactly as phoneme.engine.js computes it.
const authoritative = (arpabetBase) =>
  normalizeVowelFamily(VOWEL_TO_BASE_FAMILY[arpabetBase] || 'A');

describe('Syllabifier.syllabifyDeep vowelFamily folding', () => {
  it('folds AH to the engine family (AA), not the raw nucleus', () => {
    const deep = Syllabifier.syllabifyDeep(['K', 'AH1', 'P']);
    expect(deep[0].vowelFamily).toBe(authoritative('AH'));
    expect(deep[0].vowelFamily).not.toBe('AH');
  });

  it('folds the OY diphthong to its base family (OW)', () => {
    const deep = Syllabifier.syllabifyDeep(['B', 'OY1']);
    expect(deep[0].vowelFamily).toBe(authoritative('OY'));
    expect(deep[0].vowelFamily).not.toBe('OY');
  });

  it('leaves an already-base family (AE) unchanged', () => {
    const deep = Syllabifier.syllabifyDeep(['K', 'AE1', 'T']);
    expect(deep[0].vowelFamily).toBe(authoritative('AE'));
  });

  it('agrees with the engine fold across every divergent nucleus', () => {
    for (const base of ['AH', 'AY', 'OY', 'UH', 'AW', 'AA', 'EH', 'ER']) {
      const deep = Syllabifier.syllabifyDeep([base + '1']);
      expect(deep[0].vowelFamily).toBe(authoritative(base));
    }
  });
});
