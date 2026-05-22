import { describe, it, expect, vi } from 'vitest';
import { ArbiterAMP } from '../../codex/core/animation/arbiter/ArbiterAMP.ts';

describe('Codex Core — Animation AMP — ArbiterAMP', () => {
  it('instantiates correctly and arbitrates a prediction', async () => {
    const arbiter = new ArbiterAMP();
    const context = {
      candidates: [{ word: 'TEST', score: 0.9, baseScore: 0.9 }],
      currentSchool: 'SONIC'
    };
    
    const artifact = await arbiter.arbitrate('TE', context, {}, 1);
    
    expect(artifact.version).toBe('PB-PRED-v1');
    expect(artifact.winner).toBeDefined();
    expect(artifact.winner?.word).toBe('TEST');
    expect(artifact.projection.resonanceColor).toBe('#67e8f9'); // SONIC color
  });

  it('generates an failure bytecode on empty prediction', async () => {
    const arbiter = new ArbiterAMP();
    // Empty context, no candidates
    const artifact = await arbiter.arbitrate('', {}, null, 2);
    
    expect(artifact.winner).toBeNull();
    expect(artifact.bytecode).toContain('PB-PRED-v1-FAIL');
  });
});
