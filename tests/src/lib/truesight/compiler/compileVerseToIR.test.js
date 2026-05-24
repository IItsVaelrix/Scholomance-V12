import { describe, it, expect } from 'vitest';
import {
  createEmptyVerseIR,
  compileVerseToIR,
} from '../../../../../src/lib/truesight/compiler/compileVerseToIR.js';

const MOCK_ENGINE = {};

describe('createEmptyVerseIR', () => {
  it('returns a frozen object with version string', () => {
    const ir = createEmptyVerseIR();
    expect(typeof ir.version).toBe('string');
    expect(ir.version.length).toBeGreaterThan(0);
    expect(Object.isFrozen(ir)).toBe(true);
  });

  it('returns empty arrays for lines, tokens, surfaceSpans, syllableWindows', () => {
    const ir = createEmptyVerseIR();
    expect(ir.rawText).toBe('');
    expect(ir.normalizedText).toBe('');
    expect(ir.lines).toHaveLength(0);
    expect(ir.tokens).toHaveLength(0);
    expect(ir.surfaceSpans).toHaveLength(0);
    expect(ir.syllableWindows).toHaveLength(0);
  });

  it('returns well-formed indexes with Map values', () => {
    const { indexes } = createEmptyVerseIR();
    expect(indexes.tokenIdsByRhymeTail).toBeInstanceOf(Map);
    expect(indexes.tokenIdsByVowelFamily).toBeInstanceOf(Map);
    expect(indexes.tokenIdsByLineIndex).toHaveLength(0);
    expect(indexes.lineEndTokenIds).toHaveLength(0);
  });

  it('returns well-formed featureTables with zero counts', () => {
    const { featureTables } = createEmptyVerseIR();
    expect(featureTables.summary.tokenCount).toBe(0);
    expect(featureTables.summary.lineCount).toBe(0);
    expect(featureTables.summary.syllableWindowCount).toBe(0);
    expect(featureTables.tokenNeighborhoods).toHaveLength(0);
    expect(featureTables.lineAdjacency).toHaveLength(0);
  });

  it('metadata reflects default balanced mode', () => {
    const ir = createEmptyVerseIR();
    expect(ir.metadata.mode).toBe('balanced');
    expect(ir.metadata.tokenCount).toBe(0);
    expect(ir.metadata.lineCount).toBe(0);
    expect(ir.metadata.lineBreakStyle).toBe('none');
  });

  it('respects the mode option — analyze maps to deep_truesight', () => {
    const ir = createEmptyVerseIR({ mode: 'analyze' });
    expect(ir.metadata.mode).toBe('deep_truesight');
    expect(ir.metadata.maxWindowSyllables).toBeGreaterThan(4);
  });

  it('respects normalization options', () => {
    const ir = createEmptyVerseIR({ normalization: { lowercase: false } });
    expect(ir.metadata.normalization.lowercase).toBe(false);
  });

  it('is idempotent — multiple calls return structurally equal results', () => {
    const a = createEmptyVerseIR();
    const b = createEmptyVerseIR();
    expect(a.version).toBe(b.version);
    expect(a.metadata.mode).toBe(b.metadata.mode);
    expect(a.metadata.maxWindowSyllables).toBe(b.metadata.maxWindowSyllables);
  });
});

describe('compileVerseToIR', () => {
  it('returns empty IR for empty string', () => {
    const ir = compileVerseToIR('');
    expect(ir.rawText).toBe('');
    expect(ir.tokens).toHaveLength(0);
    expect(ir.lines).toHaveLength(0);
  });

  it('returns empty IR for null/undefined input', () => {
    expect(compileVerseToIR(null).rawText).toBe('');
    expect(compileVerseToIR(undefined).rawText).toBe('');
  });

  it('returns empty IR for whitespace-only input (tokens = 0, lines > 0)', () => {
    const ir = compileVerseToIR('   \n  ', { phonemeEngine: MOCK_ENGINE });
    expect(ir.tokens).toHaveLength(0);
  });

  it('produces one token per word with mock engine', () => {
    const ir = compileVerseToIR('hello world', { phonemeEngine: MOCK_ENGINE });
    expect(ir.tokens).toHaveLength(2);
  });

  it('populates rawText and preserves the original casing', () => {
    const ir = compileVerseToIR('Hello World', { phonemeEngine: MOCK_ENGINE });
    expect(ir.rawText).toBe('Hello World');
    expect(ir.tokens[0].text).toBe('Hello');
    expect(ir.tokens[1].text).toBe('World');
  });

  it('normalizes text to lowercase by default', () => {
    const ir = compileVerseToIR('Hello World', { phonemeEngine: MOCK_ENGINE });
    expect(ir.normalizedText).toBe('hello world');
    expect(ir.tokens[0].normalized).toBe('hello');
  });

  it('produces one line per newline-delimited segment', () => {
    const ir = compileVerseToIR('line one\nline two\nline three', { phonemeEngine: MOCK_ENGINE });
    expect(ir.lines.length).toBeGreaterThanOrEqual(3);
  });

  it('assigns correct lineIndex to tokens', () => {
    const ir = compileVerseToIR('first\nsecond', { phonemeEngine: MOCK_ENGINE });
    const [t0, t1] = ir.tokens;
    expect(t0.lineIndex).toBe(0);
    expect(t1.lineIndex).toBe(1);
  });

  it('tokens have required fields', () => {
    const ir = compileVerseToIR('magic', { phonemeEngine: MOCK_ENGINE });
    const token = ir.tokens[0];
    expect(typeof token.id).toBe('number');
    expect(typeof token.text).toBe('string');
    expect(typeof token.normalized).toBe('string');
    expect(typeof token.charStart).toBe('number');
    expect(typeof token.charEnd).toBe('number');
    expect(Array.isArray(token.phonemes)).toBe(true);
    expect(token.flags).toBeDefined();
  });

  it('isLineStart and isLineEnd flags are correct for single-word lines', () => {
    const ir = compileVerseToIR('one\ntwo', { phonemeEngine: MOCK_ENGINE });
    expect(ir.tokens[0].flags.isLineStart).toBe(true);
    expect(ir.tokens[0].flags.isLineEnd).toBe(true);
  });

  it('metadata tokenCount matches tokens array length', () => {
    const ir = compileVerseToIR('the quick brown fox', { phonemeEngine: MOCK_ENGINE });
    expect(ir.metadata.tokenCount).toBe(ir.tokens.length);
  });

  it('stop-word flag is set for known stop words', () => {
    const ir = compileVerseToIR('the', { phonemeEngine: MOCK_ENGINE });
    expect(ir.tokens[0].flags.isStopWordLike).toBe(true);
  });

  it('returns a frozen object', () => {
    const ir = compileVerseToIR('test', { phonemeEngine: MOCK_ENGINE });
    expect(Object.isFrozen(ir)).toBe(true);
  });

  it('lineBreakStyle is lf for unix-style text', () => {
    const ir = compileVerseToIR('one\ntwo', { phonemeEngine: MOCK_ENGINE });
    expect(ir.metadata.lineBreakStyle).toBe('lf');
  });

  it('lineBreakStyle is none for single-line text', () => {
    const ir = compileVerseToIR('single line', { phonemeEngine: MOCK_ENGINE });
    expect(ir.metadata.lineBreakStyle).toBe('none');
  });
});
