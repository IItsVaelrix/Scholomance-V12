import { describe, it, expect } from 'vitest';
import { serializeVerseIR } from '../../../../../src/lib/truesight/compiler/verseIRSerialization.js';
import { createEmptyVerseIR, compileVerseToIR } from '../../../../../src/lib/truesight/compiler/compileVerseToIR.js';

const MOCK_ENGINE = {};

describe('serializeVerseIR', () => {
  describe('empty IR', () => {
    it('serializes without throwing', () => {
      const empty = createEmptyVerseIR();
      expect(() => serializeVerseIR(empty)).not.toThrow();
    });

    it('produces a plain object (not frozen)', () => {
      const payload = serializeVerseIR(createEmptyVerseIR());
      expect(typeof payload).toBe('object');
      expect(payload).not.toBeNull();
    });

    it('preserves version string', () => {
      const ir = createEmptyVerseIR();
      const payload = serializeVerseIR(ir);
      expect(payload.version).toBe(ir.version);
    });

    it('rawText and normalizedText are empty strings', () => {
      const payload = serializeVerseIR(createEmptyVerseIR());
      expect(payload.rawText).toBe('');
      expect(payload.normalizedText).toBe('');
    });

    it('lines, tokens, surfaceSpans, syllableWindows are empty arrays', () => {
      const payload = serializeVerseIR(createEmptyVerseIR());
      expect(payload.lines).toHaveLength(0);
      expect(payload.tokens).toHaveLength(0);
      expect(payload.surfaceSpans).toHaveLength(0);
      expect(payload.syllableWindows).toHaveLength(0);
    });

    it('indexes serialize Map entries to nested arrays', () => {
      const payload = serializeVerseIR(createEmptyVerseIR());
      expect(Array.isArray(payload.indexes.tokenIdsByRhymeTail)).toBe(true);
      expect(Array.isArray(payload.indexes.tokenIdsByVowelFamily)).toBe(true);
      expect(Array.isArray(payload.indexes.lineEndTokenIds)).toBe(true);
    });

    it('featureTables summary has zero counts', () => {
      const payload = serializeVerseIR(createEmptyVerseIR());
      expect(payload.featureTables.summary.tokenCount).toBe(0);
      expect(payload.featureTables.summary.lineCount).toBe(0);
    });

    it('output is JSON-serializable (no circular refs, no Maps)', () => {
      const payload = serializeVerseIR(createEmptyVerseIR());
      expect(() => JSON.stringify(payload)).not.toThrow();
    });
  });

  describe('non-empty IR', () => {
    it('token text is preserved through serialization', () => {
      const ir = compileVerseToIR('magic scroll', { phonemeEngine: MOCK_ENGINE });
      const payload = serializeVerseIR(ir);
      expect(payload.tokens[0].text).toBe('magic');
      expect(payload.tokens[1].text).toBe('scroll');
    });

    it('token count matches', () => {
      const ir = compileVerseToIR('one two three', { phonemeEngine: MOCK_ENGINE });
      const payload = serializeVerseIR(ir);
      expect(payload.tokens).toHaveLength(ir.tokens.length);
    });

    it('rawText is preserved', () => {
      const text = 'ancient ritual\nsecond line';
      const ir = compileVerseToIR(text, { phonemeEngine: MOCK_ENGINE });
      const payload = serializeVerseIR(ir);
      expect(payload.rawText).toBe(text);
    });

    it('serialized indexes tokenIdsByLineIndex is an array of [lineIndex, tokenIds] pairs', () => {
      const ir = compileVerseToIR('hello world', { phonemeEngine: MOCK_ENGINE });
      const payload = serializeVerseIR(ir);
      expect(Array.isArray(payload.indexes.tokenIdsByLineIndex)).toBe(true);
      if (payload.indexes.tokenIdsByLineIndex.length > 0) {
        const entry = payload.indexes.tokenIdsByLineIndex[0];
        expect(Array.isArray(entry)).toBe(true);
        expect(entry).toHaveLength(2);
      }
    });

    it('full payload is JSON round-trippable', () => {
      const ir = compileVerseToIR('test verse', { phonemeEngine: MOCK_ENGINE });
      const payload = serializeVerseIR(ir);
      const json = JSON.stringify(payload);
      const reparsed = JSON.parse(json);
      expect(reparsed.rawText).toBe('test verse');
      expect(reparsed.tokens).toHaveLength(ir.tokens.length);
    });

    it('flags are serialized as booleans', () => {
      const ir = compileVerseToIR('the magic', { phonemeEngine: MOCK_ENGINE });
      const payload = serializeVerseIR(ir);
      const flags = payload.tokens[0].flags;
      expect(typeof flags.isLineStart).toBe('boolean');
      expect(typeof flags.isStopWordLike).toBe('boolean');
    });
  });

  describe('null / invalid input', () => {
    it('handles null gracefully without throwing', () => {
      expect(() => serializeVerseIR(null)).not.toThrow();
    });

    it('handles undefined gracefully without throwing', () => {
      expect(() => serializeVerseIR(undefined)).not.toThrow();
    });

    it('returns an object with empty arrays for invalid input', () => {
      const payload = serializeVerseIR(null);
      expect(Array.isArray(payload.tokens)).toBe(true);
      expect(Array.isArray(payload.lines)).toBe(true);
    });
  });
});
