/**
 * RhymeConnection — Line-to-Line Rhyme Connection Module
 *
 * Provides aggregate line-to-line rhyme analysis: given two lines (or a full
 * document analysis), produces a rich rhyme connection summary including
 * end-word match, internal phonetic overlaps, stress-pattern similarity,
 * syllable symmetry, and overall rhyme density.
 *
 * This is the next level up from discrete word-level connections — it answers
 * "how do these two lines relate sonically" for downstream consumers such as
 * scheme validators, visualizers, and generative verse engines.
 *
 * @module rhymeConnection
 */

import { normalizeVowelFamily } from "../phonology/vowelFamily.js";

/**
 * @typedef {import('./deepRhyme.engine.js').LineAnalysis} LineAnalysis
 */

/**
 * @typedef {Object} RhymeConnectionLineRef
 * @property {number} lineIndex
 * @property {string} text
 * @property {number} syllableCount
 * @property {string} stressPattern
 * @property {string|null} endRhymeKey
 */

/**
 * @typedef {Object} EndWordMatch
 * @property {string} wordA
 * @property {string} wordB
 * @property {string} type — 'perfect' | 'near' | 'slant' | 'assonance' | 'consonance' | 'identity' | 'none'
 * @property {number} score — 0–1
 * @property {number} syllablesMatched
 */

/**
 * @typedef {Object} CrossLinePhoneticOverlap
 * @property {{ word: string, index: number }[]} fromLineA
 * @property {{ word: string, index: number }[]} fromLineB
 * @property {number} score — aggregate overlap coefficient (0–1)
 * @property {number} pairCount — number of word pairs found
 * @property {number} avgPairScore — average score of matched pairs
 */

/**
 * @typedef {Object} StressPatternSimilarity
 * @property {string} patternA
 * @property {string} patternB
 * @property {number} score — 0–1 (Dice coefficient on stress tokens)
 * @property {'identical'|'similar'|'different'} label
 */

/**
 * @typedef {Object} SyllableSymmetry
 * @property {number} lineA
 * @property {number} lineB
 * @property {number} delta — absolute difference
 * @property {number} score — 1 / (1 + delta) — 1.0 when equal
 * @property {boolean} exact
 */

/**
 * @typedef {Object} LineRhymeConnection
 * @property {RhymeConnectionLineRef} lineA
 * @property {RhymeConnectionLineRef} lineB
 * @property {EndWordMatch} endWord
 * @property {CrossLinePhoneticOverlap} internalOverlap
 * @property {StressPatternSimilarity} stressSimilarity
 * @property {SyllableSymmetry} syllableSymmetry
 * @property {number} overallScore — weighted composite score (0–1)
 * @property {string} primaryType — 'perfect'|'near'|'slant'|'assonance'|'none'
 * @property {number} density — ratio of matched pairs to total cross-line word pairs
 */

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Compute Dice coefficient for two arrays of comparable values
 * (order-insensitive set overlap).
 * @param {string[]} a
 * @param {string[]} b
 * @returns {number}
 */
function diceCoefficient(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) return 0;
  const setA = new Set(a.filter(Boolean));
  const setB = new Set(b.filter(Boolean));
  if (setA.size === 0 && setB.size === 0) return 1;
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const val of setA) {
    if (setB.has(val)) intersection++;
  }
  return (2 * intersection) / (setA.size + setB.size);
}

/**
 * Compute Levenshtein-based similarity for short stress pattern strings.
 * Returns 1.0 for identical, approaching 0 for completely different.
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
function stressPatternSimilarityScore(a, b) {
  if (!a && !b) return 1;
  if (!a || !b) return 0;
  const normA = a.replace(/\s+/g, ' ').trim();
  const normB = b.replace(/\s+/g, ' ').trim();
  if (normA === normB) return 1;
  const tokensA = normA.split(' ');
  const tokensB = normB.split(' ');
  // Dice on individual stress tokens (e.g. "1-0" vs "1-0")
  const stressTokensA = tokensA.map(t => t.replace(/[^0-2]/g, ''));
  const stressTokensB = tokensB.map(t => t.replace(/[^0-2]/g, ''));
  return diceCoefficient(stressTokensA, stressTokensB);
}

/**
 * Normalize a stress pattern string to uniform stress levels (1/0).
 * @param {string} pattern
 * @returns {string}
 */
function normalizeStressPattern(pattern) {
  if (!pattern) return '';
  return pattern
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map(p => {
      const digits = p.replace(/[^0-2]/g, '');
      return digits ? (digits.includes('1') || digits.includes('2') ? '1' : '0') : '';
    })
    .filter(Boolean)
    .join(' ');
}

// ─── Core Functions ─────────────────────────────────────────────────────────

/**
 * Extract a simplified line reference from a LineAnalysis object.
 * @param {LineAnalysis} line
 * @returns {RhymeConnectionLineRef}
 */
function extractLineRef(line) {
  return {
    lineIndex: line.lineIndex,
    text: line.text,
    syllableCount: Number(line.syllableTotal) || 0,
    stressPattern: line.stressPattern || '',
    endRhymeKey: line.endRhymeKey || null,
  };
}

/**
 * Analyze the end-word relationship between two lines.
 * Returns a match descriptor even when there is no rhyme (type: 'none').
 *
 * @param {LineAnalysis} lineA
 * @param {LineAnalysis} lineB
 * @param {object} [options]
 * @param {(wordA: string, wordB: string) => string|null} [options.matchDictionaryFamily]
 *   Optional callback that returns the shared authoritative rhyme_family
 *   for two end-words, or `null` if they do not share one. When provided
 *   and the callback returns a non-null family, the end-word match is
 *   promoted to `perfect` immediately, before any local-phoneme fallback.
 * @returns {EndWordMatch}
 */
function analyzeEndWordMatch(lineA, lineB, options = {}) {
  const endA = lineA.endWord;
  const endB = lineB.endWord;

  if (!endA || !endB) {
    return { wordA: '', wordB: '', type: 'none', score: 0, syllablesMatched: 0 };
  }

  const wordA = endA.word || '';
  const wordB = endB.word || '';
  const rhymeKeyA = endA.rhymeKey || '';
  const rhymeKeyB = endB.rhymeKey || '';

  // Dictionary check FIRST — but a shared family is NOT sufficient on its own.
  //
  // `rhyme_family` is the bare VOWEL family ("AY", "IH"), which thousands of
  // unrelated words share. Promoting on it alone declared survival/liars/igniting
  // perfect rhymes in deepRhyme.engine (see matchRhymeDomain there). This path is
  // the same trap, armed harder: it returns score 1.0 outright, bypassing every
  // phoneme check below. It is currently latent — nothing in production passes
  // the callback — so this guard closes it before someone wires it up.
  //
  // The rhyme KEY is the rhyme domain (family + the whole tail), and its equality
  // IS the perfect-rhyme predicate. Require both: the dictionary agrees AND the
  // domains actually match.
  if (options.matchDictionaryFamily) {
    const sharedFamily = options.matchDictionaryFamily(wordA, wordB);
    const domainsMatch = Boolean(rhymeKeyA) && rhymeKeyA === rhymeKeyB;
    if (sharedFamily && domainsMatch) {
      return {
        wordA,
        wordB,
        type: 'perfect',
        score: 1.0,
        syllablesMatched: Math.max(
          Math.min(
            Number(endA.syllableCount) || 1,
            Number(endB.syllableCount) || 1,
          ),
          1,
        ),
        dictionaryFamily: sharedFamily,
      };
    }
  }

  // Check if they share the same rhyme key (phoneme-level match)
  if (rhymeKeyA && rhymeKeyB && rhymeKeyA === rhymeKeyB) {
    return {
      wordA,
      wordB,
      type: 'perfect',
      score: 1.0,
      syllablesMatched: Math.min(
        Number(endA.syllableCount) || 1,
        Number(endB.syllableCount) || 1,
      ),
    };
  }

  // Fall back to vowel family comparison for assonance/slant
  const familyA = endA.vowelFamily || '';
  const familyB = endB.vowelFamily || '';
  const normalizedA = normalizeVowelFamily(familyA);
  const normalizedB = normalizeVowelFamily(familyB);

  // Check for match via analysis data if available
  const analysisA = endA.analysis;
  const analysisB = endB.analysis;

  if (analysisA && analysisB) {
    const keyA = String(analysisA.rhymeKey || '');
    const keyB = String(analysisB.rhymeKey || '');
    if (keyA && keyB && keyA === keyB) {
      return {
        wordA,
        wordB,
        type: 'perfect',
        score: 1.0,
        syllablesMatched: Math.min(
          Number(analysisA.syllableCount) || 1,
          Number(analysisB.syllableCount) || 1,
        ),
      };
    }

    // Check terminal vowel family
    const termA = analysisA.terminalVowelFamily || '';
    const termB = analysisB.terminalVowelFamily || '';
    const normTermA = normalizeVowelFamily(termA);
    const normTermB = normalizeVowelFamily(termB);
    if (normTermA && normTermB && normTermA === normTermB) {
      return { wordA, wordB, type: 'assonance', score: 0.7, syllablesMatched: 1 };
    }
  }

  if (normalizedA && normalizedB && normalizedA === normalizedB) {
    return { wordA, wordB, type: 'assonance', score: 0.6, syllablesMatched: 1 };
  }

  return { wordA, wordB, type: 'none', score: 0, syllablesMatched: 0 };
}

/**
 * Aggregate internal (non-end-word) phonetic overlaps between two lines.
 * Counts and scores all cross-line word pairs that share phonetic features.
 *
 * @param {LineAnalysis} lineA
 * @param {LineAnalysis} lineB
 * @returns {CrossLinePhoneticOverlap}
 */
function analyzeInternalOverlap(lineA, lineB) {
  const wordsA = (lineA.words || []).filter(w => w && w.analysis);
  const wordsB = (lineB.words || []).filter(w => w && w.analysis);

  // Exclude end words from internal overlap analysis since they're covered
  // by endWord match above.
  const interiorA = wordsA.length > 1 ? wordsA.slice(0, -1) : [];
  const interiorB = wordsB.length > 1 ? wordsB.slice(0, -1) : [];

  if (interiorA.length === 0 || interiorB.length === 0) {
    return { fromLineA: [], fromLineB: [], score: 0, pairCount: 0, avgPairScore: 0 };
  }

  const fromLineA = [];
  const fromLineB = [];
  const pairScores = [];

  // Use rhymeKey and vowelFamily for fast phonetic matching.
  // Collect rhyme keys and vowel families from line B into lookup maps.
  const bRhymeKeys = new Map();
  const bVowelFamilies = new Map();
  for (const w of interiorB) {
    const key = w.analysis?.rhymeKey;
    if (key) bRhymeKeys.set(key, w);
    const vf = w.vowelFamily || w.analysis?.terminalVowelFamily || '';
    const norm = normalizeVowelFamily(vf);
    if (norm) bVowelFamilies.set(norm, w);
  }

  for (const wA of interiorA) {
    const aKey = wA.analysis?.rhymeKey;
    const aVf = wA.vowelFamily || wA.analysis?.terminalVowelFamily || '';
    const aNorm = normalizeVowelFamily(aVf);

    // Check rhyme key match first (strongest signal)
    if (aKey && bRhymeKeys.has(aKey)) {
      const wB = bRhymeKeys.get(aKey);
      const idxB = interiorB.indexOf(wB);
      fromLineA.push({ word: wA.word, index: wA.wordIndex });
      fromLineB.push({ word: wB.word, index: wB.wordIndex });
      pairScores.push(1.0);
      continue;
    }

    // Check vowel family match (assonance)
    if (aNorm && bVowelFamilies.has(aNorm)) {
      const wB = bVowelFamilies.get(aNorm);
      const idxB = interiorB.indexOf(wB);
      fromLineA.push({ word: wA.word, index: wA.wordIndex });
      fromLineB.push({ word: wB.word, index: wB.wordIndex });
      pairScores.push(0.6);
    }
  }

  if (pairScores.length === 0) {
    return { fromLineA: [], fromLineB: [], score: 0, pairCount: 0, avgPairScore: 0 };
  }

  const avgPairScore = pairScores.reduce((s, v) => s + v, 0) / pairScores.length;
  // Normalize the overlap score as the proportion of interior words matched
  const totalInterior = Math.max(interiorA.length, interiorB.length);
  const overlapScore = pairScores.length > 0
    ? (pairScores.length / totalInterior) * avgPairScore
    : 0;

  return {
    fromLineA,
    fromLineB,
    score: Math.min(overlapScore, 1),
    pairCount: pairScores.length,
    avgPairScore,
  };
}

/**
 * Compute syllable symmetry metrics between two lines.
 * @param {LineAnalysis} lineA
 * @param {LineAnalysis} lineB
 * @returns {SyllableSymmetry}
 */
function analyzeSyllableSymmetry(lineA, lineB) {
  const countA = Number(lineA.syllableTotal) || 0;
  const countB = Number(lineB.syllableTotal) || 0;
  const delta = Math.abs(countA - countB);

  return {
    lineA: countA,
    lineB: countB,
    delta,
    score: 1 / (1 + delta),
    exact: countA === countB,
  };
}

/**
 * Analyze stress pattern similarity between two lines.
 * @param {LineAnalysis} lineA
 * @param {LineAnalysis} lineB
 * @returns {StressPatternSimilarity}
 */
function analyzeStressSimilarity(lineA, lineB) {
  const patA = normalizeStressPattern(lineA.stressPattern || '');
  const patB = normalizeStressPattern(lineB.stressPattern || '');
  const score = stressPatternSimilarityScore(patA, patB);

  let label;
  if (patA === patB) label = 'identical';
  else if (score >= 0.75) label = 'similar';
  else label = 'different';

  return { patternA: patA, patternB: patB, score, label };
}

/**
 * Compute the primary rhyme type from the composite analysis.
 * The strongest available signal determines the type.
 *
 * @param {EndWordMatch} endWord
 * @param {CrossLinePhoneticOverlap} overlap
 * @param {number} overallScore
 * @returns {string}
 */
function determinePrimaryType(endWord, overlap, overallScore) {
  if (endWord.type === 'perfect' || endWord.type === 'identity') return 'perfect';
  if (endWord.type === 'near') return 'near';
  if (overlap.score >= 0.5) return 'internal_assonance';
  if (endWord.type === 'assonance') return 'assonance';
  if (endWord.type === 'slant') return 'slant';
  if (overlap.pairCount > 0) return 'internal_echo';
  if (overallScore >= 0.3) return 'weak';
  return 'none';
}

/**
 * Compute rhyme density — what fraction of cross-line word pairs show
 * phonetic relationship.
 *
 * @param {LineAnalysis} lineA
 * @param {LineAnalysis} lineB
 * @param {CrossLinePhoneticOverlap} overlap
 * @returns {number}
 */
function computeDensity(lineA, lineB, overlap) {
  const wordsA = (lineA.words || []).length;
  const wordsB = (lineB.words || []).length;
  if (wordsA === 0 || wordsB === 0) return 0;
  const maxPossiblePairs = wordsA * wordsB;
  if (maxPossiblePairs === 0) return 0;
  return overlap.pairCount / maxPossiblePairs;
}

// ─── Public API ─────────────────────────────────────────────────────────────

const OVERALL_WEIGHTS = {
  endWord: 0.45,
  internalOverlap: 0.25,
  stressSimilarity: 0.15,
  syllableSymmetry: 0.15,
};

/**
 * Analyze the full rhyme connection between two lines.
 *
 * @param {LineAnalysis} lineA — First line analysis (from deepRhyme.engine)
 * @param {LineAnalysis} lineB — Second line analysis
 * @param {object} [options]
 * @param {number} [options.endWordWeight=0.45]
 * @param {number} [options.internalOverlapWeight=0.25]
 * @param {number} [options.stressWeight=0.15]
 * @param {number} [options.syllableWeight=0.15]
 * @param {(wordA: string, wordB: string) => string|null} [options.matchDictionaryFamily]
 *   Optional callback that returns the shared authoritative rhyme_family
 *   for two end-words, or `null` if they do not share one. Promotes the
 *   end-word match to `perfect` when the dictionary agrees.
 * @returns {LineRhymeConnection}
 */
export function connectLines(lineA, lineB, options = {}) {
  const weights = {
    endWord: options.endWordWeight ?? OVERALL_WEIGHTS.endWord,
    internalOverlap: options.internalOverlapWeight ?? OVERALL_WEIGHTS.internalOverlap,
    stressSimilarity: options.stressWeight ?? OVERALL_WEIGHTS.stressSimilarity,
    syllableSymmetry: options.syllableWeight ?? OVERALL_WEIGHTS.syllableSymmetry,
  };

  const endWord = analyzeEndWordMatch(lineA, lineB, { matchDictionaryFamily: options.matchDictionaryFamily });
  const internalOverlap = analyzeInternalOverlap(lineA, lineB);
  const stressSimilarity = analyzeStressSimilarity(lineA, lineB);
  const syllableSymmetry = analyzeSyllableSymmetry(lineA, lineB);

  // Compute weighted overall score
  const overallScore = Math.min(
    (endWord.score * weights.endWord) +
    (internalOverlap.score * weights.internalOverlap) +
    (stressSimilarity.score * weights.stressSimilarity) +
    (syllableSymmetry.score * weights.syllableSymmetry),
    1,
  );

  const primaryType = determinePrimaryType(endWord, internalOverlap, overallScore);
  const density = computeDensity(lineA, lineB, internalOverlap);

  return {
    lineA: extractLineRef(lineA),
    lineB: extractLineRef(lineB),
    endWord,
    internalOverlap,
    stressSimilarity,
    syllableSymmetry,
    overallScore,
    primaryType,
    density,
  };
}

/**
 * Build a line-to-line connection adjacency for a full document analysis.
 * Returns an array of all non-identical line pairs (i < j) in document order,
 * sorted by overallScore descending.
 *
 * @param {LineAnalysis[]} lines — Array of LineAnalysis from DeepRhymeEngine
 * @param {object} [options]
 * @param {number} [options.minScore=0] — Minimum overallScore threshold
 * @param {boolean} [options.includeAdjacentOnly=false] — Only connect consecutive lines
 * @returns {LineRhymeConnection[]}
 */
export function connectDocument(lines, options = {}) {
  if (!Array.isArray(lines) || lines.length < 2) return [];

  const minScore = options.minScore ?? 0;
  const adjacentOnly = options.includeAdjacentOnly ?? false;
  const connections = [];

  for (let i = 0; i < lines.length; i++) {
    const jStart = adjacentOnly ? i + 1 : i + 1;
    const jEnd = adjacentOnly ? Math.min(i + 2, lines.length) : lines.length;

    for (let j = jStart; j < jEnd; j++) {
      const conn = connectLines(lines[i], lines[j], options);
      if (conn.overallScore >= minScore) {
        connections.push(conn);
      }
    }
  }

  // Sort by overallScore descending (most strongly connected first)
  connections.sort((a, b) => b.overallScore - a.overallScore);
  return connections;
}

/**
 * Build a full adjacency matrix of line-to-line rhyme connections.
 * Returns a 2D array where matrix[i][j] = LineRhymeConnection for i < j,
 * and null for i >= j (or i === j).
 *
 * @param {LineAnalysis[]} lines
 * @param {object} [options]
 * @returns {(LineRhymeConnection|null)[][]}
 */
export function connectDocumentMatrix(lines, options = {}) {
  if (!Array.isArray(lines) || lines.length === 0) return [];

  const n = lines.length;
  const matrix = Array.from({ length: n }, () => Array(n).fill(null));

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      matrix[i][j] = connectLines(lines[i], lines[j], options);
    }
  }

  return matrix;
}

/**
 * Extract a stanza-level rhyme scheme pattern from a document analysis,
 * enriched with connection strengths. Uses end-word matches primarily,
 * falling back to overall connection score for weak/no end-rhyme lines.
 *
 * @param {LineAnalysis[]} lines
 * @param {LineRhymeConnection[]} [connections] — Pre-computed from connectDocument()
 * @param {object} [options]
 * @param {number} [options.endWordThreshold=0.5] — Min endWord score to count as rhyme
 * @returns {{ pattern: string, labels: Map<string, number[]>, confidence: number }}
 */
export function deriveSchemePattern(lines, connections, options = {}) {
  if (!Array.isArray(lines) || lines.length === 0) {
    return { pattern: '', labels: new Map(), confidence: 0 };
  }

  const threshold = options.endWordThreshold ?? 0.5;

  // Use pre-computed connections if provided, otherwise compute on the fly
  const conns = Array.isArray(connections)
    ? connections
    : connectDocument(lines, { ...options, minScore: 0 });

  // Build adjacency: for each line, find the best-matching earlier line
  // based on endWord score first, then overallScore.
  const lineToGroup = new Map();
  const groupToLines = new Map();
  let nextLabel = 0;

  // Helper: get label char
  const labelChar = (idx) => {
    const base = 'A'.charCodeAt(0);
    const offset = idx % 26;
    const repeat = Math.floor(idx / 26);
    const ch = String.fromCharCode(base + offset);
    return repeat === 0 ? ch : `${ch}${repeat}`;
  };

  for (let i = 0; i < lines.length; i++) {
    if (lineToGroup.has(i)) continue;

    // Find best earlier line that end-rhymes with i
    let bestMatch = -1;
    let bestScore = 0;

    for (let j = 0; j < i; j++) {
      // Look up connection from matrix (connections are sorted, but we want
      // the specific (j, i) pair)
      const conn = conns.find(
        c => (c.lineA.lineIndex === j && c.lineB.lineIndex === i) ||
             (c.lineA.lineIndex === i && c.lineB.lineIndex === j)
      );
      if (!conn) continue;

      const endScore = conn.endWord.score;
      if (endScore >= threshold && endScore > bestScore) {
        bestScore = endScore;
        bestMatch = j;
      }
    }

    if (bestMatch >= 0 && lineToGroup.has(bestMatch)) {
      const group = lineToGroup.get(bestMatch);
      lineToGroup.set(i, group);
      groupToLines.get(group).push(i);
    } else {
      const label = labelChar(nextLabel);
      lineToGroup.set(i, label);
      groupToLines.set(label, [i]);
      nextLabel++;
    }
  }

  // Build pattern string
  const pattern = lines.map((_, i) => lineToGroup.get(i) || 'X').join('');

  // Compute confidence: ratio of lines with end-rhyme score above threshold
  let aboveThreshold = 0;
  for (let i = 0; i < lines.length; i++) {
    for (let j = i + 1; j < lines.length; j++) {
      const conn = conns.find(
        c => (c.lineA.lineIndex === i && c.lineB.lineIndex === j) ||
             (c.lineA.lineIndex === j && c.lineB.lineIndex === i)
      );
      if (conn && conn.endWord.score >= threshold) {
        aboveThreshold++;
        break;
      }
    }
  }
  const confidence = lines.length > 1 ? aboveThreshold / lines.length : 0;

  return { pattern, labels: groupToLines, confidence };
}
