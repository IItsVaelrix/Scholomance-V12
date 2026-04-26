import { describe, it, expect } from 'vitest';
import { ArbiterAMP } from '../../../codex/core/animation/arbiter/ArbiterAMP.ts';

describe('ArbiterAMP — Ritual Prediction Brain', () => {
  const arbiter = new ArbiterAMP();

  it('should deterministically score phonetic candidates', async () => {
    const context = {
      candidates: [
        { word: 'sight', baseScore: 0.5 },
        { word: 'light', baseScore: 0.5 }
      ],
      rhymeMatch: 'light',
      currentSchool: 'SONIC'
    };

    const artifact = await arbiter.arbitrate('the ', context, null, 1);
    
    expect(artifact.winner?.word).toBe('light');
    expect(artifact.winner?.score).toBeGreaterThan(0.7);
    expect(artifact.bytecode).toContain('PB-PRED-v1-1');
  });

  it('should apply Oracle mood bias to candidates', async () => {
    const context = {
      candidates: [{ word: 'vision', baseScore: 0.5 }],
      currentSchool: 'VOID'
    };

    const normalArtifact = await arbiter.arbitrate('my ', context, null, 2);
    const awedArtifact = await arbiter.arbitrate('my ', context, { mood: 'AWE' }, 3);

    expect(awedArtifact.winner?.score).toBeGreaterThan(normalArtifact.winner?.score || 0);
  });

  it('should return NULL bytecode when no candidates pass the threshold', async () => {
    const context = {
      candidates: [{ word: 'bad', baseScore: 0.1 }],
      currentSchool: 'ALCHEMY'
    };
    
    // minConfidence is 0.3 by default
    const artifact = await arbiter.arbitrate('a ', context, null, 4);
    
    expect(artifact.winner).toBeNull();
    expect(artifact.bytecode).toBe('PB-PRED-v1-NULL-4');
  });
});
