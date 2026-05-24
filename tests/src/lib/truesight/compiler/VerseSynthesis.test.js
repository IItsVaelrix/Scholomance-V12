import { describe, it, expect } from 'vitest';
import { synthesizeVerse } from '../../../../../src/lib/truesight/compiler/VerseSynthesis.js';

describe('synthesizeVerse', () => {
  describe('empty text fast-path', () => {
    it('returns an artifact for empty string without throwing', () => {
      expect(() => synthesizeVerse('')).not.toThrow();
    });

    it('returns an artifact for whitespace-only text without throwing', () => {
      expect(() => synthesizeVerse('   ')).not.toThrow();
      expect(() => synthesizeVerse('\n\n')).not.toThrow();
    });

    it('empty artifact has isPure flag', () => {
      const artifact = synthesizeVerse('');
      expect(artifact.isPure).toBe(true);
    });

    it('empty artifact has zero totalSyllables', () => {
      const artifact = synthesizeVerse('');
      expect(artifact.totalSyllables).toBe(0);
    });

    it('empty artifact has null verseIR and syntaxLayer', () => {
      const artifact = synthesizeVerse('');
      expect(artifact.verseIR).toBeNull();
      expect(artifact.syntaxLayer).toBeNull();
    });

    it('empty artifact tokenByIdentity is an empty Map', () => {
      const artifact = synthesizeVerse('');
      expect(artifact.tokenByIdentity).toBeInstanceOf(Map);
      expect(artifact.tokenByIdentity.size).toBe(0);
    });

    it('empty artifact emotion defaults to Neutral', () => {
      const artifact = synthesizeVerse('');
      expect(artifact.emotion).toBe('Neutral');
    });

    it('empty artifact literaryDevices is an empty array', () => {
      const artifact = synthesizeVerse('');
      expect(Array.isArray(artifact.literaryDevices)).toBe(true);
      expect(artifact.literaryDevices).toHaveLength(0);
    });

    it('artifact is frozen', () => {
      const artifact = synthesizeVerse('');
      expect(Object.isFrozen(artifact)).toBe(true);
    });

    it('null input behaves like empty string', () => {
      expect(() => synthesizeVerse(null)).not.toThrow();
      const artifact = synthesizeVerse(null);
      expect(artifact.isPure).toBe(true);
    });

    it('undefined input behaves like empty string', () => {
      expect(() => synthesizeVerse(undefined)).not.toThrow();
    });
  });
});
