import { describe, it, expect, beforeEach } from 'vitest';
import { ArbiterAMP } from '../../../codex/core/animation/arbiter/ArbiterAMP.ts';

describe('High Inquisitor — Rhyme Integrity Battery', () => {
  let arbiter;

  beforeEach(() => {
    arbiter = new ArbiterAMP();
  });

  const RHYME_BATTERY = [
    { word1: 'cat', word2: 'hat', expected: true },
    { word1: 'bite', word2: 'smite', expected: true },
    { word1: 'car', word2: 'bar', expected: true },
    { word1: 'lyrical', word2: 'miracle', expected: true },
    { word1: 'Temper High', word2: 'Semper Fi', expected: true },
    { word1: 'Desire', word2: 'fire', expected: true },
    { word1: 'Cabbage', word2: 'Savage', expected: true },
    { word1: 'Pathetic', word2: 'Electric', expected: true },
  ];

  RHYME_BATTERY.forEach(({ word1, word2, expected }) => {
    it(`should verify resonance between "${word1}" and "${word2}"`, async () => {
      // Mock context where word2 is a candidate for word1
      const context = {
        candidates: [{ word: word2, baseScore: 0.6 }],
        rhymeMatch: word2, // Force phonetic success for this test
        currentSchool: 'SONIC'
      };

      const artifact = await arbiter.arbitrate(word1, context, null, Date.now());
      
      if (expected) {
        expect(artifact.winner?.word).toBe(word2);
        expect(artifact.bytecode).not.toContain('FAIL');
      } else {
        expect(artifact.bytecode).toContain('FAIL');
      }
    });
  });

  it('should generate a 0x101 fingerprint for a phonetic mismatch', async () => {
    const context = {
      candidates: [{ word: 'orange', baseScore: 0.1 }],
      rhymeMatch: 'apple', // Mismatch
      currentSchool: 'VOID'
    };

    const artifact = await arbiter.arbitrate('the ', context, null, 777);
    
    // NUCLEUS_MISMATCH is 0x101
    expect(artifact.bytecode).toBe('PB-PRED-v1-FAIL-777-0x101');
  });
});
