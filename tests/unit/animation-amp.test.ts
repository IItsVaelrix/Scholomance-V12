import { describe, it, expect } from 'vitest';
import { fuseMotionOutput } from '../../codex/core/animation/amp/fuseMotionOutput.ts';
import { MotionWorkingState } from '../../codex/core/animation/contracts/animation.types.ts';

describe('Animation AMP — Motion Fusion', () => {
  it('fuses working state into resolved motion output with defaults', () => {
    const workingState: MotionWorkingState = {
      intent: { version: '1.0.0', targetId: 'test-target' },
      values: { width: 100, height: 100 },
      flags: { reduced: false, gpuAccelerated: true },
      diagnostics: [],
      trace: [{ timestamp: 100, processorId: 'test', stage: 'timing', changed: [] }]
    };

    const output = fuseMotionOutput(workingState);

    expect(output.success).toBe(true);
    expect(output.values.durationMs).toBe(300);
    expect(output.values.opacity).toBe(1);
    expect(output.cssVariables['--anim-duration']).toBe('300ms');
    expect(output.framerTransition.duration).toBe(0.3);
  });

  it('handles custom easing and loop configurations', () => {
    const workingState: MotionWorkingState = {
      intent: { version: '1.0.0', targetId: 'test-target' },
      values: { width: 100, height: 100, durationMs: 500, easing: 'ease-in', loop: true },
      flags: { reduced: false, gpuAccelerated: false },
      diagnostics: [],
      trace: [{ timestamp: 100, processorId: 'test', stage: 'timing', changed: [] }]
    };

    const output = fuseMotionOutput(workingState);

    expect(output.success).toBe(true);
    expect(output.framerTransition.duration).toBe(0.5);
    expect(output.framerTransition.repeat).toBe(Infinity);
    expect(output.framerTransition.ease).toBe('easeIn');
  });

  it('includes diagnostic trace info', () => {
    const workingState: MotionWorkingState = {
      intent: { version: '1.0.0', targetId: 'test-target' },
      values: { width: 100, height: 100 },
      flags: { reduced: false, gpuAccelerated: true },
      diagnostics: ['process-started'],
      trace: [
        { timestamp: 100, processorId: 'step1', stage: 'timing', changed: [] }, 
        { timestamp: 200, processorId: 'step2', stage: 'timing', changed: [] }
      ]
    };

    const output = fuseMotionOutput(workingState);

    expect(output.success).toBe(true);
    expect(output.diagnostics).toContain('process-started');
    expect(output.performance.processorCount).toBe(2);
    expect(output.performance.processingTimeMs).toBe(200);
  });
});
