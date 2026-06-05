import { useMemo, useCallback } from 'react';
import { normalizeVowelFamily } from '../lib/phonology/vowelFamily';
import { alignPhonemes } from '../lib/phonology/phonemeAlignment';
import { VOWEL_FAMILY_TO_SCHOOL } from '../data/schools.js';

// ARPAbet vowel nuclei (stress-stripped). Used to locate the rhyme tail.
const ARPABET_VOWELS = new Set([
  'AA', 'AE', 'AH', 'AO', 'AW', 'AY', 'EH', 'ER',
  'EY', 'IH', 'IY', 'OW', 'OY', 'UH', 'UW',
]);

// Max normalized alignment cost (cost per tail position) for two words to count
// as a near-rhyme. Calibrated against phonemeAlignment's cost table: a true
// rhyme scores 0; a single similar-vowel swap (~0.65) over a 2-phoneme tail is
// ~0.33; a vowel↔consonant mismatch (5.0) blows well past the threshold.
const NEAR_RHYME_MAX_NORM_COST = 0.5;

const phonemeBase = (p) => String(p).replace(/[0-9]/g, '').toUpperCase();

/**
 * Extracts the rhyme tail of a phoneme sequence: the slice from the last
 * primary-stressed vowel (falling back to the last vowel of any stress) through
 * the end. This is the portion that actually carries rhyme.
 * @param {string[]} phonemes - ARPAbet phonemes (stress digits optional)
 * @returns {string[]}
 */
function extractRhymeTail(phonemes) {
  if (!Array.isArray(phonemes) || phonemes.length === 0) return [];

  let idx = -1;
  for (let k = phonemes.length - 1; k >= 0; k--) {
    if (/1$/.test(phonemes[k]) && ARPABET_VOWELS.has(phonemeBase(phonemes[k]))) {
      idx = k;
      break;
    }
  }
  if (idx === -1) {
    for (let k = phonemes.length - 1; k >= 0; k--) {
      if (ARPABET_VOWELS.has(phonemeBase(phonemes[k]))) {
        idx = k;
        break;
      }
    }
  }

  return idx === -1 ? phonemes.slice() : phonemes.slice(idx);
}

/**
 * Length-normalized phoneme alignment cost between two rhyme tails.
 * Lower = more similar; 0 = identical.
 * @returns {number}
 */
function normalizedAlignmentCost(tailA, tailB) {
  if (!tailA.length || !tailB.length) return Infinity;
  const { cost } = alignPhonemes(tailA, tailB);
  return cost / Math.max(tailA.length, tailB.length);
}

const STOP_WORDS = new Set([
  "A", "AN", "THE",
  "I", "ME", "MY", "WE", "US", "OUR",
  "YOU", "YOUR",
  "HE", "HIM", "HIS", "SHE", "HER",
  "IT", "ITS",
  "THEY", "THEM", "THEIR",
  "AM", "IS", "ARE", "WAS", "WERE", "BE", "BEEN", "BEING",
  "HAS", "HAVE", "HAD",
  "DO", "DOES", "DID",
  "WILL", "WOULD", "SHALL", "SHOULD",
  "CAN", "COULD", "MAY", "MIGHT", "MUST",
  "IN", "ON", "AT", "TO", "FOR", "OF", "BY", "FROM", "UP",
  "WITH", "AS", "INTO", "BUT", "OR", "AND", "SO", "IF",
  "NOT", "NO", "NOR",
  "THAT", "THIS", "THAN",
  "WHAT", "WHEN", "WHERE", "WHO", "HOW", "WHICH",
  "ABOUT", "JUST", "VERY", "TOO", "ALSO",
]);

/**
 * useColorCodex — Bytecode-native hook for phonetic color state.
 * 
 * Consumes VisualBytecode from wordAnalyses (produced by Codex VerseIR amplifier).
 * No longer builds legacy colorMap — bytecode is authoritative.
 */
export function useColorCodex(wordAnalyses, activeConnections, syntaxLayer = null, options = {}) {
  const { analysisMode = 'none' } = options;
  const connectionCount = Array.isArray(activeConnections) ? activeConnections.length : 0;

  const analysisByCharStart = useMemo(() => {
    const map = new Map();
    if (!Array.isArray(wordAnalyses)) return map;

    for (const analysis of wordAnalyses) {
      const charStart = Number(analysis?.charStart);
      if (!Number.isInteger(charStart) || charStart < 0) continue;
      map.set(charStart, analysis);
    }

    return map;
  }, [wordAnalyses]);

  // Build charStart -> bytecode lookup from wordAnalyses
  const bytecodeByCharStart = useMemo(() => {
    const map = new Map();
    if (!Array.isArray(wordAnalyses)) return map;

    for (const analysis of wordAnalyses) {
      const charStart = Number(analysis?.charStart);
      if (!Number.isInteger(charStart) || charStart < 0) continue;

      // Prioritize visualBytecode, fall back to trueVisionBytecode
      const bytecode = analysis?.visualBytecode || analysis?.trueVisionBytecode || null;
      if (bytecode) {
        map.set(charStart, { bytecode, analysis });
      }
    }

    return map;
  }, [wordAnalyses]);

  // Build connection context for rhyme mode coloring
  const colorContext = useMemo(() => {
    const connectedTokenCharStarts = new Set();
    const substitutionFamilies = new Set();
    const directNonStopFamilies = new Set();
    // Rhyme tails of the non-stop connection endpoints — the reference set that
    // candidate words are phoneme-aligned against for near-rhyme promotion.
    const connectedRhymeTails = [];
    // Memoization of near-rhyme decisions keyed by candidate rhyme tail. Lives
    // on colorContext so it is discarded whenever the connection set changes.
    const rhymeSimCache = new Map();
    const connections = Array.isArray(activeConnections) ? activeConnections : [];

    if (connections.length === 0) {
      return { connectedTokenCharStarts, substitutionFamilies, directNonStopFamilies, connectedRhymeTails, rhymeSimCache };
    }

    for (const conn of connections) {
      const register = (wordRef) => {
        if (!wordRef) return;
        const charStart = Number(wordRef?.charStart);
        const fallbackAnalysis = Number.isInteger(charStart) && charStart >= 0
          ? analysisByCharStart.get(charStart)
          : null;
        if (Number.isInteger(charStart) && charStart >= 0) {
          connectedTokenCharStarts.add(charStart);
        }

        const norm = (
          wordRef?.normalizedWord
          || wordRef?.word
          || fallbackAnalysis?.normalizedWord
          || fallbackAnalysis?.word
          || ""
        ).toUpperCase();
        const isNonStop = norm && !STOP_WORDS.has(norm);

        const family = normalizeVowelFamily(
          wordRef?.terminalVowelFamily
          || wordRef?.vowelFamily
          || fallbackAnalysis?.terminalVowelFamily
          || fallbackAnalysis?.vowelFamily
        );
        if (family) {
          substitutionFamilies.add(family);
          if (isNonStop) {
            directNonStopFamilies.add(family);
          }
        }

        const phonemes = (Array.isArray(wordRef?.phonemes) && wordRef.phonemes.length)
          ? wordRef.phonemes
          : (Array.isArray(fallbackAnalysis?.phonemes) ? fallbackAnalysis.phonemes : null);
        if (phonemes && isNonStop) {
          const tail = extractRhymeTail(phonemes);
          if (tail.length > 0) connectedRhymeTails.push(tail);
        }
      };
      register(conn.wordA);
      register(conn.wordB);
    }

    return { connectedTokenCharStarts, substitutionFamilies, directNonStopFamilies, connectedRhymeTails, rhymeSimCache };
  }, [activeConnections, analysisByCharStart]);

  /**
   * Determines if a word should be colored based on its bytecode and analysis mode.
   * 
   * @param {number} charStart - Character offset of the word
   * @param {string} normalizedWord - Uppercase normalized word
   * @param {string} vowelFamily - Vowel family identifier
   * @returns {boolean} - True if the word should be colored
   */
  const shouldColorWord = useCallback((charStart, normalizedWord, vowelFamily) => {
    const isStopWord = STOP_WORDS.has(normalizedWord);
    const entry = bytecodeByCharStart.get(charStart);
    const bytecode = entry?.bytecode;

    const isAMPMode = false;

    // AMP modes can still color structural content without explicit bytecode.
    if (!bytecode) {
      if ((analysisMode === 'vowel' || isAMPMode) && !isStopWord) {
        return !!vowelFamily;
      }
      return false;
    }

    if (bytecode.effectClass === 'INERT' && !isAMPMode) {
      return false;
    }

    if (analysisMode === 'vowel' || isAMPMode) {
      return !isStopWord || isAMPMode;
    }

    // RHYME mode: color based on connection participation
    const isRhymeMode = analysisMode === 'rhyme' || (analysisMode === 'none' && connectionCount > 0);

    if (isRhymeMode) {
      // When explicit rhyme connections exist, restrict coloring to direct
      // participants and same-family peers promoted via stop-word endpoints.
      if (connectionCount > 0) {
        if (colorContext.connectedTokenCharStarts.has(charStart)) {
          return true;
        }

        const normalizedFamily = normalizeVowelFamily(vowelFamily);
        if (
          normalizedFamily
          && !isStopWord
          && colorContext.substitutionFamilies.has(normalizedFamily)
          && !colorContext.directNonStopFamilies.has(normalizedFamily)
        ) {
          return true;
        }

        // Slant/near-rhyme promotion (alignPhonemes): color words whose rhyme
        // tail aligns closely with a connected endpoint's tail, catching slant
        // rhymes that exact vowel-family matching misses. Additive only.
        if (!isStopWord && colorContext.connectedRhymeTails.length > 0) {
          const candidatePhonemes = entry?.analysis?.phonemes
            || analysisByCharStart.get(charStart)?.phonemes;
          const candidateTail = extractRhymeTail(candidatePhonemes);
          if (candidateTail.length > 0) {
            const cacheKey = candidateTail.join('|');
            let promote = colorContext.rhymeSimCache.get(cacheKey);
            if (promote === undefined) {
              promote = colorContext.connectedRhymeTails.some(
                (tail) => normalizedAlignmentCost(candidateTail, tail) <= NEAR_RHYME_MAX_NORM_COST
              );
              colorContext.rhymeSimCache.set(cacheKey, promote);
            }
            if (promote) return true;
          }
        }

        return false;
      }
      // No active connections: fall through to bytecode-driven coloring below.
    }

    // Default: color if bytecode has any resonance signal
    return bytecode.glowIntensity > 0 || bytecode.effectClass !== 'INERT';
  }, [analysisMode, bytecodeByCharStart, colorContext, connectionCount, analysisByCharStart]);

  /**
   * Retrieves bytecode and derived color info for a word.
   * 
   * @param {number} charStart - Character offset of the word
   * @returns {{ bytecode: object|null, analysis: object|null, school: string|null, color: string|null }}
   */
  const getBytecodeForWord = useCallback((charStart) => {
    const entry = bytecodeByCharStart.get(charStart);
    if (!entry) {
      return { bytecode: null, analysis: null, school: null, color: null };
    }

    const { bytecode, analysis } = entry;
    const school = bytecode?.school || (analysis?.vowelFamily ? VOWEL_FAMILY_TO_SCHOOL[normalizeVowelFamily(analysis.vowelFamily)] : null) || null;
    const color = bytecode?.color || null;

    return { bytecode, analysis, school, color };
  }, [bytecodeByCharStart]);

  return { 
    bytecodeByCharStart, 
    shouldColorWord,
    getBytecodeForWord,
  };
}
