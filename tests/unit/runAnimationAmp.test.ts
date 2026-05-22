import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runAnimationAmp, initAnimationAmp, shutdownAnimationAmp } from '../../codex/core/animation/amp/runAnimationAmp.ts';
import { AnimationIntent } from '../../codex/core/animation/contracts/animation.types.ts';

describe('Codex Core — Animation AMP — Core Runner', () => {
  beforeEach(() => {
    initAnimationAmp({ debug: false, bytecodeEnabled: false });
  });

  it('runs animation intent and returns motion output', async () => {
    const intent: AnimationIntent = { 
      version: 'v1.0', 
      targetId: 'test-target',
      trigger: 'mount',
      preset: 'none'
    };

    const output = await runAnimationAmp(intent);

    expect(output.success).toBe(true);
    expect(output.targetId).toBe('test-target');
    expect(output.values).toBeDefined();
  });

  it('handles automatic initialization if not run', async () => {
    shutdownAnimationAmp();
    const intent: AnimationIntent = { 
      version: 'v1.0', 
      targetId: 'test-target',
      trigger: 'mount'
    };

    const output = await runAnimationAmp(intent);
    expect(output.success).toBe(true);
  });
});
