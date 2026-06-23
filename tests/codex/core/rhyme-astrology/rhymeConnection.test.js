/**
 * rhymeConnection.test.js — Tests for the line-to-line RhymeConnection module
 *
 * Uses hand-crafted mock LineAnalysis objects (matching the shape
 * produced by DeepRhymeEngine.buildLineAnalysisFromIRLine) so the
 * tests are deterministic and do not require a phoneme engine.
 *
 * Test lines (rap verse — user's lyrics):
 *   Line 0: "body is dead, with a mind of a Zero"       — end-word: ZERO
 *   Line 1: "copy the death of divine like a hero"       — end-word: HERO
 *   Line 2: "Sloppy, my breath is aligned with a weird flow" — end-word: FLOW
 *   Line 3: "obvious stench from the rhyme, I'm a scarecrow" — end-word: SCARECROW
 *
 * Rhyme structure:
 *   Zero ↔ hero — PERFECT (same rhymeKey "IY1 R OW1")
 *   flow ↔ scarecrow — ASSONANCE (shared terminal vowel family "OW1")
 *   Scheme: AABB
 *
 * Internal phonetic echoes (dense cross-line connections):
 *   AA1 vowel family:  body, copy, Sloppy, obvious
 *   EH1 vowel family:  dead, death, breath, stench
 *   AY1 vowel family:  mind, divine, aligned, rhyme
 *   Perfect internal:  copy↔Sloppy (rhymeKey "AA1 P IY")
 *   Perfect internal:  mind↔aligned (rhymeKey "AY1 N D")
 *   Assonance:         dead↔death↔breath↔stench (EH1)
 *   Assonance:         mind↔divine↔aligned↔rhyme (AY1)
 *   Assonance:         body↔copy↔Sloppy↔obvious (AA1)
 */

import { describe, it, expect } from 'vitest';
import {
  connectLines,
  connectDocument,
  connectDocumentMatrix,
  deriveSchemePattern,
} from '../../../../codex/core/rhyme-astrology/rhymeConnection.js';

// ─── Helpers: build a word-level token (matching createLineWordFromToken) ───

function makeWord({
  word,
  wordIndex,
  lineIndex,
  rhymeKey = null,
  vowelFamily = null,
  syllableCount = 1,
  stressPattern = '1',
}, analysisOverrides = {}) {
  const upper = word.toUpperCase();
  const analysis = Object.freeze({
    word: upper,
    vowelFamily: vowelFamily || null,
    phonemes: [],
    syllables: [],
    syllableCount,
    rhymeKey: rhymeKey || null,
    extendedRhymeKeys: [],
    stressPattern,
    ...analysisOverrides,
  });

  return {
    word: upper,
    normalizedWord: upper,
    vowelFamily,
    rhymeKey,
    syllableCount,
    stressPattern,
    lineIndex,
    wordIndex,
    charStart: 0,
    charEnd: word.length,
    analysis,
    syntaxToken: null,
  };
}

function makeLineAnalysis({ lineIndex, text, words }) {
  const wordObjects = words.map((w, idx) =>
    makeWord({
      word: w.word,
      wordIndex: idx,
      lineIndex,
      rhymeKey: w.rhymeKey,
      vowelFamily: w.vowelFamily,
      syllableCount: w.syllableCount ?? 1,
      stressPattern: w.stressPattern ?? '1',
    }, w._analysisOverrides || {}),
  );

  const totalSyllables = wordObjects.reduce((s, w) => s + w.syllableCount, 0);
  const stressPattern = wordObjects.map(w => w.stressPattern).join(' ');
  const endWord = wordObjects[wordObjects.length - 1];

  return {
    lineIndex,
    text,
    words: wordObjects,
    syllableTotal: totalSyllables,
    stressPattern,
    internalRhymes: [],
    endRhymeKey: endWord.rhymeKey || null,
    endWord: endWord,
  };
}

// ─── Test fixture lines — user's rap verse ──────────────────────────────────

const LINES = [
  {
    lineIndex: 0,
    text: 'body is dead, with a mind of a Zero',
    words: [
      { word: 'body',    rhymeKey: 'AA1 D IY',    vowelFamily: 'AA1',  syllableCount: 2, stressPattern: '10' },
      { word: 'is',      rhymeKey: null,            vowelFamily: null,   syllableCount: 1, stressPattern: '0' },
      { word: 'dead',    rhymeKey: 'EH1 D',        vowelFamily: 'EH1',  syllableCount: 1, stressPattern: '1' },
      { word: 'with',    rhymeKey: null,            vowelFamily: null,   syllableCount: 1, stressPattern: '0' },
      { word: 'a',       rhymeKey: null,            vowelFamily: null,   syllableCount: 1, stressPattern: '0' },
      { word: 'mind',    rhymeKey: 'AY1 N D',      vowelFamily: 'AY1',  syllableCount: 1, stressPattern: '1' },
      { word: 'of',      rhymeKey: null,            vowelFamily: null,   syllableCount: 1, stressPattern: '0' },
      { word: 'a',       rhymeKey: null,            vowelFamily: null,   syllableCount: 1, stressPattern: '0' },
      { word: 'Zero',    rhymeKey: 'IY1 R OW1',    vowelFamily: 'IY1',  syllableCount: 2, stressPattern: '10' },
    ],
  },
  {
    lineIndex: 1,
    text: 'copy the death of divine like a hero',
    words: [
      { word: 'copy',   rhymeKey: 'AA1 P IY',    vowelFamily: 'AA1',  syllableCount: 2, stressPattern: '10' },
      { word: 'the',     rhymeKey: null,            vowelFamily: null,   syllableCount: 1, stressPattern: '0' },
      { word: 'death',   rhymeKey: 'EH1 TH',       vowelFamily: 'EH1',  syllableCount: 1, stressPattern: '1' },
      { word: 'of',      rhymeKey: null,            vowelFamily: null,   syllableCount: 1, stressPattern: '0' },
      { word: 'divine',  rhymeKey: 'AY1 N',        vowelFamily: 'AY1',  syllableCount: 2, stressPattern: '01' },
      { word: 'like',    rhymeKey: null,            vowelFamily: null,   syllableCount: 1, stressPattern: '0' },
      { word: 'a',       rhymeKey: null,            vowelFamily: null,   syllableCount: 1, stressPattern: '0' },
      { word: 'hero',    rhymeKey: 'IY1 R OW1',    vowelFamily: 'IY1',  syllableCount: 2, stressPattern: '10' },
    ],
  },
  {
    lineIndex: 2,
    text: 'Sloppy, my breath is aligned with a weird flow',
    words: [
      { word: 'Sloppy',  rhymeKey: 'AA1 P IY',    vowelFamily: 'AA1',  syllableCount: 2, stressPattern: '10' },
      { word: 'my',      rhymeKey: null,            vowelFamily: null,   syllableCount: 1, stressPattern: '0' },
      { word: 'breath',  rhymeKey: 'EH1 TH',       vowelFamily: 'EH1',  syllableCount: 1, stressPattern: '1' },
      { word: 'is',      rhymeKey: null,            vowelFamily: null,   syllableCount: 1, stressPattern: '0' },
      { word: 'aligned', rhymeKey: 'AY1 N D',      vowelFamily: 'AY1',  syllableCount: 2, stressPattern: '01' },
      { word: 'with',    rhymeKey: null,            vowelFamily: null,   syllableCount: 1, stressPattern: '0' },
      { word: 'a',       rhymeKey: null,            vowelFamily: null,   syllableCount: 1, stressPattern: '0' },
      { word: 'weird',   rhymeKey: null,            vowelFamily: null,   syllableCount: 1, stressPattern: '1' },
      { word: 'flow',    rhymeKey: 'OW1',          vowelFamily: 'OW1',  syllableCount: 1, stressPattern: '1',
        _analysisOverrides: { terminalVowelFamily: 'OW1' } },
    ],
  },
  {
    lineIndex: 3,
    text: "obvious stench from the rhyme, I'm a scarecrow",
    words: [
      { word: 'obvious',  rhymeKey: 'AA1 B V IY', vowelFamily: 'AA1',  syllableCount: 3, stressPattern: '100' },
      { word: 'stench',   rhymeKey: 'EH1 N CH',   vowelFamily: 'EH1',  syllableCount: 1, stressPattern: '1' },
      { word: 'from',     rhymeKey: null,           vowelFamily: null,   syllableCount: 1, stressPattern: '0' },
      { word: 'the',      rhymeKey: null,           vowelFamily: null,   syllableCount: 1, stressPattern: '0' },
      { word: 'rhyme',    rhymeKey: 'AY1 M',       vowelFamily: 'AY1',  syllableCount: 1, stressPattern: '1' },
      { word: "I'm",      rhymeKey: null,           vowelFamily: null,   syllableCount: 1, stressPattern: '0' },
      { word: 'a',        rhymeKey: null,           vowelFamily: null,   syllableCount: 1, stressPattern: '0' },
      { word: 'scarecrow', rhymeKey: 'EH1 R K R OW1', vowelFamily: 'EH1', syllableCount: 2, stressPattern: '10',
        _analysisOverrides: { terminalVowelFamily: 'OW1' } },
    ],
  },
];

const lineAnalyses = LINES.map(makeLineAnalysis);

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('codex/core/rhyme-astrology/rhymeConnection — rap verse', () => {

  // ── connectLines ──────────────────────────────────────────────────────────

  describe('connectLines — line pair analysis', () => {

    it('detects perfect end-rhyme: Zero ↔ hero (same rhymeKey "IY1 R OW1")', () => {
      const conn = connectLines(lineAnalyses[0], lineAnalyses[1]);

      expect(conn.endWord.type).toBe('perfect');
      expect(conn.endWord.score).toBeCloseTo(1.0);
      expect(conn.endWord.wordA).toBe('ZERO');
      expect(conn.endWord.wordB).toBe('HERO');
      expect(conn.endWord.syllablesMatched).toBe(2);
      expect(conn.primaryType).toBe('perfect');
      expect(conn.overallScore).toBeGreaterThanOrEqual(0.45);
    });

    it('detects assonance end-rhyme: flow ↔ scarecrow (terminal "OW1")', () => {
      const conn = connectLines(lineAnalyses[2], lineAnalyses[3]);

      expect(conn.endWord.type).toBe('assonance');
      expect(conn.endWord.score).toBeCloseTo(0.7);
      expect(conn.endWord.wordA).toBe('FLOW');
      expect(conn.endWord.wordB).toBe('SCARECROW');
      expect(conn.primaryType).toBe('assonance');
    });

    it('returns "none" for non-rhyming pair: Zero ↔ flow', () => {
      const conn = connectLines(lineAnalyses[0], lineAnalyses[2]);

      expect(conn.endWord.type).toBe('none');
      expect(conn.endWord.score).toBe(0);
    });

    it('populates lineA / lineB refs correctly', () => {
      const conn = connectLines(lineAnalyses[0], lineAnalyses[3]);

      expect(conn.lineA.lineIndex).toBe(0);
      expect(conn.lineA.text).toBe('body is dead, with a mind of a Zero');
      expect(conn.lineA.syllableCount).toBe(11);
      expect(conn.lineB.lineIndex).toBe(3);
      expect(conn.lineB.text).toBe("obvious stench from the rhyme, I'm a scarecrow");
      expect(conn.lineB.syllableCount).toBe(11);
    });

    it('computes syllable symmetry (all lines are 11 syllables)', () => {
      const conn = connectLines(lineAnalyses[0], lineAnalyses[1]);

      expect(conn.syllableSymmetry.lineA).toBe(11);
      expect(conn.syllableSymmetry.lineB).toBe(11);
      expect(conn.syllableSymmetry.delta).toBe(0);
      expect(conn.syllableSymmetry.score).toBeCloseTo(1.0);
      expect(conn.syllableSymmetry.exact).toBe(true);
    });

    it('computes stress similarity between lines', () => {
      const conn = connectLines(lineAnalyses[0], lineAnalyses[1]);

      expect(typeof conn.stressSimilarity.score).toBe('number');
      expect(conn.stressSimilarity.score).toBeGreaterThanOrEqual(0);
      expect(conn.stressSimilarity.score).toBeLessThanOrEqual(1);
      expect(['identical', 'similar', 'different']).toContain(conn.stressSimilarity.label);
    });

    describe('internal phonetic overlaps', () => {
      it('finds internal echoes: dead↔death (EH1), mind↔divine (AY1), body↔copy (AA1) in lines 0↔1', () => {
        const conn = connectLines(lineAnalyses[0], lineAnalyses[1]);

        expect(conn.internalOverlap.pairCount).toBeGreaterThanOrEqual(2);
        expect(conn.internalOverlap.score).toBeGreaterThan(0);

        const wordsFromA = conn.internalOverlap.fromLineA.map(p => p.word);
        const wordsFromB = conn.internalOverlap.fromLineB.map(p => p.word);
        const hasBodyCopy  = wordsFromA.includes('BODY')  && wordsFromB.includes('COPY');
        const hasDeadDeath = wordsFromA.includes('DEAD')  && wordsFromB.includes('DEATH');
        const hasMindDivine= wordsFromA.includes('MIND')  && wordsFromB.includes('DIVINE');
        expect(hasBodyCopy || hasDeadDeath || hasMindDivine).toBe(true);
      });

      it('finds perfect internal rhyme: copy ↔ Sloppy (same rhymeKey "AA1 P IY") in lines 1↔2', () => {
        const conn = connectLines(lineAnalyses[1], lineAnalyses[2]);

        expect(conn.internalOverlap.pairCount).toBeGreaterThanOrEqual(1);
        const wordsFromB = conn.internalOverlap.fromLineB.map(p => p.word);
        expect(wordsFromB).toContain('SLOPPY');
      });

      it('finds perfect internal rhyme: mind ↔ aligned (same rhymeKey "AY1 N D") in lines 0↔2', () => {
        const conn = connectLines(lineAnalyses[0], lineAnalyses[2]);

        const wordsFromA = conn.internalOverlap.fromLineA.map(p => p.word);
        const wordsFromB = conn.internalOverlap.fromLineB.map(p => p.word);
        expect(wordsFromA).toContain('MIND');
        expect(wordsFromB).toContain('ALIGNED');
      });

      it('finds at least one vowel-family echo in every cross-line pair', () => {
        for (let i = 0; i < 4; i++) {
          for (let j = i + 1; j < 4; j++) {
            const conn = connectLines(lineAnalyses[i], lineAnalyses[j]);
            expect(conn.internalOverlap.pairCount)
              .withContext(`lines ${i}↔${j} should have internal overlap`)
              .toBeGreaterThanOrEqual(1);
          }
        }
      });
    });

    it('density reflects the rich internal rhyming (density > 0)', () => {
      const conn = connectLines(lineAnalyses[0], lineAnalyses[1]);
      expect(conn.density).toBeGreaterThan(0);
      expect(conn.density).toBeLessThanOrEqual(1);
    });

    it('accepts custom weights via options', () => {
      const connDefault = connectLines(lineAnalyses[0], lineAnalyses[1]);
      const connCustom = connectLines(lineAnalyses[0], lineAnalyses[1], {
        endWordWeight: 0.8,
        internalOverlapWeight: 0.1,
        stressWeight: 0.05,
        syllableWeight: 0.05,
      });

      expect(connCustom.overallScore).not.toBeCloseTo(connDefault.overallScore);
      expect(connCustom.overallScore).toBeGreaterThanOrEqual(0.8);
    });
  });

  // ── connectDocument ───────────────────────────────────────────────────────

  describe('connectDocument — all-pairs document analysis', () => {
    it('returns an array of all line pairs (6 for 4 lines)', () => {
      const connections = connectDocument(lineAnalyses);
      expect(Array.isArray(connections)).toBe(true);
      expect(connections.length).toBe(6);
    });

    it('sorts connections by overallScore descending', () => {
      const connections = connectDocument(lineAnalyses);
      for (let i = 1; i < connections.length; i++) {
        expect(connections[i - 1].overallScore)
          .toBeGreaterThanOrEqual(connections[i].overallScore);
      }
    });

    it('places the perfect end-rhyme pair (0↔1) highest', () => {
      const connections = connectDocument(lineAnalyses);
      expect(connections[0].lineA.lineIndex).toBe(0);
      expect(connections[0].lineB.lineIndex).toBe(1);
      expect(connections[0].endWord.type).toBe('perfect');
    });

    it('filters by minScore', () => {
      const all = connectDocument(lineAnalyses, { minScore: 0 });
      const filtered = connectDocument(lineAnalyses, { minScore: 0.5 });

      expect(filtered.length).toBeLessThan(all.length);
      for (const conn of filtered) {
        expect(conn.overallScore).toBeGreaterThanOrEqual(0.5);
      }
    });

    it('returns adjacent-only pairs when includeAdjacentOnly is true', () => {
      const adj = connectDocument(lineAnalyses, { includeAdjacentOnly: true });

      expect(adj.length).toBe(3);
      for (const conn of adj) {
        expect(Math.abs(conn.lineA.lineIndex - conn.lineB.lineIndex)).toBe(1);
      }
    });

    it('returns empty array for fewer than 2 lines', () => {
      expect(connectDocument([])).toEqual([]);
      expect(connectDocument([lineAnalyses[0]])).toEqual([]);
    });
  });

  // ── connectDocumentMatrix ─────────────────────────────────────────────────

  describe('connectDocumentMatrix — adjacency matrix', () => {
    it('returns an N×N matrix (4×4 for 4 lines)', () => {
      const matrix = connectDocumentMatrix(lineAnalyses);
      expect(matrix.length).toBe(4);
      for (const row of matrix) {
        expect(row.length).toBe(4);
      }
    });

    it('has null on diagonal / lower triangle, connections on upper', () => {
      const matrix = connectDocumentMatrix(lineAnalyses);
      for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
          if (i >= j) {
            expect(matrix[i][j]).toBeNull();
          } else {
            expect(matrix[i][j]).not.toBeNull();
            expect(matrix[i][j].lineA.lineIndex).toBe(i);
            expect(matrix[i][j].lineB.lineIndex).toBe(j);
          }
        }
      }
    });

    it('returns empty for empty input', () => {
      expect(connectDocumentMatrix([])).toEqual([]);
    });
  });

  // ── deriveSchemePattern ───────────────────────────────────────────────────

  describe('deriveSchemePattern — rhyme scheme detection', () => {
    it('detects AABB pattern: Zero↔hero (A), flow↔scarecrow (B)', () => {
      const result = deriveSchemePattern(lineAnalyses);

      expect(result.pattern).toBe('AABB');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('returns labels map with line indices per group', () => {
      const result = deriveSchemePattern(lineAnalyses);

      expect(result.labels instanceof Map).toBe(true);
      expect(result.labels.size).toBe(2);
      expect(result.labels.get('A')).toEqual([0, 1]);
      expect(result.labels.get('B')).toEqual([2, 3]);
    });

    it('returns empty pattern for empty input', () => {
      const result = deriveSchemePattern([]);
      expect(result.pattern).toBe('');
      expect(result.confidence).toBe(0);
    });

    it('accepts pre-computed connections', () => {
      const conns = connectDocument(lineAnalyses);
      const result = deriveSchemePattern(lineAnalyses, conns);
      expect(result.pattern).toBe('AABB');
    });

    it('respects endWordThreshold option', () => {
      // threshold 1.0 — only perfect (score 1.0) counts for grouping
      const result = deriveSchemePattern(lineAnalyses, null, { endWordThreshold: 1.0 });
      // Line 0 → new group A
      // Line 1 → matches A (perfect 1.0)
      // Line 2 → no earlier perfect match → new group B
      // Line 3 → no earlier perfect match (2↔3 is assonance 0.7 < 1.0) → new group C
      expect(result.pattern).toBe('AABC');
    });
  });

  // ── Edge cases ────────────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('handles lines with missing endWord gracefully', () => {
      const badLine = {
        lineIndex: 99,
        text: '',
        words: [],
        syllableTotal: 0,
        stressPattern: '',
        internalRhymes: [],
        endRhymeKey: null,
        endWord: null,
      };
      const conn = connectLines(lineAnalyses[0], badLine);

      expect(conn.endWord.type).toBe('none');
      expect(conn.endWord.score).toBe(0);
      expect(conn.overallScore).toBeGreaterThanOrEqual(0);
    });

    it('handles single-word lines', () => {
      const single = makeLineAnalysis({
        lineIndex: 0,
        text: 'go',
        words: [{ word: 'go', rhymeKey: 'OW1', vowelFamily: 'OW1', syllableCount: 1, stressPattern: '1' }],
      });
      const conn = connectLines(single, single);
      expect(conn.endWord.type).toBe('perfect');
    });

    it('produces deterministic results across repeated calls', () => {
      const a = connectLines(lineAnalyses[0], lineAnalyses[1]);
      const b = connectLines(lineAnalyses[0], lineAnalyses[1]);
      expect(a).toEqual(b);
    });

    it('all four lines have equal syllable count (11) — perfect symmetry', () => {
      const sym01 = connectLines(lineAnalyses[0], lineAnalyses[1]).syllableSymmetry;
      const sym23 = connectLines(lineAnalyses[2], lineAnalyses[3]).syllableSymmetry;
      const sym02 = connectLines(lineAnalyses[0], lineAnalyses[2]).syllableSymmetry;

      expect(sym01.exact).toBe(true);
      expect(sym23.exact).toBe(true);
      expect(sym02.exact).toBe(true);
      expect(sym01.delta).toBe(0);
      expect(sym23.delta).toBe(0);
      expect(sym02.delta).toBe(0);
    });
  });
});
