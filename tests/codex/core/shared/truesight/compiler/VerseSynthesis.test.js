import { describe, it, expect } from 'vitest';
import { synthesizeVerse } from '../../../../../../codex/core/shared/truesight/compiler/VerseSynthesis.js';

describe('codex synthesizeVerse', () => {
  it('returns an artifact for empty string without throwing', () => {
    expect(() => synthesizeVerse('')).not.toThrow();
  });

  it('empty-path artifact has isPure flag', () => {
    expect(synthesizeVerse('').isPure).toBe(true);
  });

  it('empty-path artifact has zero totalSyllables', () => {
    expect(synthesizeVerse('').totalSyllables).toBe(0);
  });

  it('empty-path artifact has null verseIR', () => {
    expect(synthesizeVerse('').verseIR).toBeNull();
  });

  it('empty-path artifact is frozen', () => {
    expect(Object.isFrozen(synthesizeVerse(''))).toBe(true);
  });
});
