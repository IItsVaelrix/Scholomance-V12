/**
 * CODEx Syllabification Engine
 * Implements Maximal Onset Principle (MOP) and Sonority Sequencing Principle (SSP).
 * 
 * The syllabifier assigns intervocalic consonants to onsets and codas using:
 * 1. MOP: Maximize onset consonants (give as many as possible to the next syllable)
 * 2. SSP: Onsets must rise in sonority, codas must fall
 * 3. Phonotactic validation: Both onset and coda must be legal English sequences
 */

import { ARPABET_VOWELS, SONORITY_HIERARCHY, VOWEL_TO_BASE_FAMILY } from './phoneme.constants.js';
import { Phonotactics } from './phonotactics.js';
import { normalizeVowelFamily } from './vowelFamily.js';

/**
 * Get sonority value for a phoneme.
 * @param {string} phoneme - ARPAbet phoneme (with or without stress).
 * @returns {number}
 */
function getSonority(phoneme) {
  const base = String(phoneme || '').replace(/[0-9]/g, '').toUpperCase();
  return SONORITY_HIERARCHY[base] || 0;
}

/**
 * Strip stress markers from a phoneme.
 * @param {string} phoneme
 * @returns {string}
 */
function stripStress(phoneme) {
  return String(phoneme || '').replace(/[0-9]/g, '');
}

/**
 * Check if a phoneme is a vowel.
 * @param {string} phoneme
 * @returns {boolean}
 */
function isVowel(phoneme) {
  return ARPABET_VOWELS.has(stripStress(phoneme));
}

/**
 * Extract stress level from a phoneme.
 * @param {string} phoneme
 * @returns {number} 0, 1, or 2
 */
function getStress(phoneme) {
  const match = String(phoneme || '').match(/[0-9]/);
  return match ? parseInt(match[0], 10) : 0;
}

/**
 * Check if a consonant sequence has rising sonority (valid onset pattern).
 * @param {string[]} consonants
 * @returns {boolean}
 */
function hasRisingSonority(consonants) {
  if (consonants.length <= 1) return true;
  for (let i = 0; i < consonants.length - 1; i++) {
    if (getSonority(consonants[i]) >= getSonority(consonants[i + 1])) return false;
  }
  return true;
}

/**
 * Check if a consonant sequence has falling sonority (valid coda pattern).
 * @param {string[]} consonants
 * @returns {boolean}
 */
function hasFallingSonority(consonants) {
  if (consonants.length <= 1) return true;
  for (let i = 0; i < consonants.length - 1; i++) {
    if (getSonority(consonants[i]) <= getSonority(consonants[i + 1])) return false;
  }
  return true;
}

/**
 * Find the optimal split point for intervocalic consonants.
 * Returns the index where onset begins (everything before is coda, from index onward is onset).
 * 
 * Strategy:
 * 1. Start with Maximal Onset (give as many consonants as possible to onset)
 * 2. Validate that both onset AND coda are phonotactically legal
 * 3. Check SSP compliance for both onset and coda
 * 4. If invalid, shift consonants from onset to coda until valid
 * 
 * @param {string[]} intervocalic - Consonants between two vowels.
 * @returns {number} Split index (0 = all onset, length = all coda).
 */
function findOptimalSplit(intervocalic) {
  if (intervocalic.length === 0) return 0;
  
  // Try all possible split points from most onset-heavy to most coda-heavy
  // (Maximal Onset Principle: prefer giving consonants to onset)
  for (let splitAt = 0; splitAt <= intervocalic.length; splitAt++) {
    const onset = intervocalic.slice(splitAt);
    const coda = intervocalic.slice(0, splitAt);
    
    const onsetValid = Phonotactics.validateOnset(onset).valid;
    const codaValid = Phonotactics.validateCoda(coda).valid;
    
    // Additionally check SSP for both onset and coda
    const onsetSSP = hasRisingSonority(onset);
    const codaSSP = hasFallingSonority(coda);
    
    if (onsetValid && codaValid && onsetSSP && codaSSP) {
      return splitAt;
    }
  }
  
  // Fallback: all consonants go to coda
  return intervocalic.length;
}

/**
 * Breaks a sequence of phonemes into syllables.
 */
export const Syllabifier = {
  /**
   * Syllabifies a list of phonemes using MOP + SSP.
   * @param {string[]} phonemes - ARPAbet phonemes (with or without stress).
   * @returns {string[][]} Array of syllables, each being an array of phonemes.
   */
  syllabify(phonemes) {
    if (!phonemes || phonemes.length === 0) return [];
    
    // Handle single-phoneme edge case
    if (phonemes.length === 1) {
      return [phonemes];
    }

    // 1. Locate all nuclei (vowels)
    const vowelIndices = [];
    for (let i = 0; i < phonemes.length; i++) {
      if (isVowel(phonemes[i])) {
        vowelIndices.push(i);
      }
    }

    // No vowels: treat entire sequence as one syllable (consonantal utterance)
    if (vowelIndices.length === 0) return [phonemes];

    // 2. Segment based on vowel positions
    const syllables = [];
    let lastSplit = 0;
    
    for (let i = 0; i < vowelIndices.length; i++) {
      const isLastVowel = i === vowelIndices.length - 1;
      const currentVowelIdx = vowelIndices[i];
      const nextVowelIdx = isLastVowel ? phonemes.length : vowelIndices[i + 1];

      // Intervocalic consonants between this vowel and the next
      const intervocalic = phonemes.slice(currentVowelIdx + 1, nextVowelIdx);
      
      let splitPoint;
      if (isLastVowel) {
        // After the last vowel, everything is coda
        splitPoint = intervocalic.length;
      } else {
        // Use MOP + SSP + phonotactic validation to find optimal split
        splitPoint = findOptimalSplit(intervocalic);
      }

      const syllable = phonemes.slice(lastSplit, currentVowelIdx + 1 + splitPoint);
      syllables.push(syllable);
      lastSplit = currentVowelIdx + 1 + splitPoint;
    }

    return syllables;
  },

  /**
   * Syllabifies and returns structured syllable objects with onset/nucleus/coda decomposition.
   * @param {string[]} phonemes - ARPAbet phonemes (with or without stress).
   * @returns {Array<{index: number, onset: string[], nucleus: string, coda: string[], stress: number, vowelFamily: string}>}
   */
  syllabifyDeep(phonemes) {
    const rawSyllables = this.syllabify(phonemes);
    
    return rawSyllables.map((seg, idx) => {
      const vIdx = seg.findIndex(p => isVowel(p));
      const vowel = vIdx >= 0 ? seg[vIdx] : 'AH0';
      const onset = vIdx >= 0 ? seg.slice(0, vIdx) : [];
      const coda = vIdx >= 0 ? seg.slice(vIdx + 1) : seg;
      const stress = getStress(vowel);
      const baseV = stripStress(vowel);

      return {
        index: idx,
        onset,
        nucleus: vowel,
        coda,
        stress,
        // Fold the raw ARPABET nucleus into the canonical color-key family,
        // exactly as phoneme.engine.js does. Emitting the raw nucleus (AH/AY/
        // OY/UH/AW…) diverges from the authoritative family and flips the
        // school/color (COLOR_DRAGON vowelFamily-source-divergence).
        vowelFamily: normalizeVowelFamily(VOWEL_TO_BASE_FAMILY[baseV] || 'A'),
      };
    });
  },

  /**
   * Returns the sonority profile of a syllable (array of sonority values).
   * Useful for visualizing the sonority contour.
   * @param {string[]} syllablePhonemes - Phonemes of a single syllable.
   * @returns {number[]}
   */
  sonorityProfile(syllablePhonemes) {
    if (!syllablePhonemes || syllablePhonemes.length === 0) return [];
    return syllablePhonemes.map(p => getSonority(p));
  },

  /**
   * Checks if a syllable has a well-formed sonority contour
   * (rising in onset, falling in coda).
   * @param {string[]} syllablePhonemes
   * @returns {{ valid: boolean, profile: number[], violations: string[] }}
   */
  checkSonorityContour(syllablePhonemes) {
    if (!syllablePhonemes || syllablePhonemes.length === 0) {
      return { valid: true, profile: [], violations: [] };
    }
    
    const profile = syllablePhonemes.map(p => getSonority(p));
    const violations = [];
    
    // Find nucleus index (peak sonority)
    const vIdx = syllablePhonemes.findIndex(p => isVowel(p));
    if (vIdx < 0) {
      return { valid: false, profile, violations: ['No vowel nucleus found'] };
    }
    
    // Check onset (before nucleus): should rise
    for (let i = 0; i < vIdx - 1; i++) {
      if (profile[i] >= profile[i + 1]) {
        violations.push(`Onset SSP violation at position ${i}: ${syllablePhonemes[i]}(${profile[i]}) >= ${syllablePhonemes[i+1]}(${profile[i+1]})`);
      }
    }
    
    // Check coda (after nucleus): should fall
    for (let i = vIdx + 1; i < profile.length - 1; i++) {
      if (profile[i] <= profile[i + 1]) {
        violations.push(`Coda SSP violation at position ${i}: ${syllablePhonemes[i]}(${profile[i]}) <= ${syllablePhonemes[i+1]}(${profile[i+1]})`);
      }
    }
    
    return { valid: violations.length === 0, profile, violations };
  },
};
