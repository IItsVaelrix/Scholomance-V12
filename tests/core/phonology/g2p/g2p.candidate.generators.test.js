import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateRuleCandidates,
  generateSubstringCandidates,
  retrieveVectorNNPhonemeCandidates,
} from '../../../../codex/core/phonology/g2p/candidates/index.js';

describe('G2P Candidate Generators', () => {
  describe('generateRuleCandidates', () => {
    it('returns bounded candidate set for a word', () => {
      const candidates = generateRuleCandidates('KELDOMN');
      expect(candidates.length).toBeGreaterThanOrEqual(1);
      expect(candidates.length).toBeLessThanOrEqual(10);
    });

    it('produces at least one candidate for any non-empty word', () => {
      const candidates = generateRuleCandidates('TEST');
      expect(candidates.length).toBeGreaterThanOrEqual(1);
    });

    it('dedupes identical phoneme sequences', () => {
      const candidates = generateRuleCandidates('KELDOMN');
      const seen = new Set();
      for (const candidate of candidates) {
        const key = candidate.phonemes.join(' ');
        expect(seen.has(key)).toBe(false);
        seen.add(key);
      }
    });

    it('includes origin metadata for every candidate', () => {
      const candidates = generateRuleCandidates('KELDOMN');
      for (const candidate of candidates) {
        expect(typeof candidate.id).toBe('string');
        expect(typeof candidate.word).toBe('string');
        expect(Array.isArray(candidate.phonemes)).toBe(true);
        expect(typeof candidate.source).toBe('string');
        expect(typeof candidate.generatedBy).toBe('string');
      }
    });
  });

  describe('generateSubstringCandidates', () => {
    it('fallbacks to empty when cmuEntries is empty', () => {
      const candidates = generateSubstringCandidates('KELDOMN', []);
      expect(Array.isArray(candidates)).toBe(true);
    });

    it('respects min grapheme overlap', () => {
      const candidates = generateSubstringCandidates('AB', [
        ['KELDOMN', [['K', 'EH1', 'L', 'D', 'AA1', 'M', 'AH0', 'N']]],
      ]);
      expect(candidates.length).toBe(0);
    });
  });

  describe('retrieveVectorNNPhonemeCandidates', () => {
    it('returns empty for words shorter than min overlap', () => {
      const candidates = retrieveVectorNNPhonemeCandidates('AB', []);
      expect(candidates).toHaveLength(0);
    });

    it('returns empty when cmuEntries is empty', () => {
      const candidates = retrieveVectorNNPhonemeCandidates('KELDOMN', []);
      expect(candidates).toHaveLength(0);
    });
  });
});
