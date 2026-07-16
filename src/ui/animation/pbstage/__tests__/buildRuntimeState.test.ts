import { describe, it, expect } from 'vitest';
import { buildRuntimeState } from '../buildRuntimeState';

describe('buildRuntimeState', () => {
  it('maps inputs to the resolver dot-paths', () => {
    const s = buildRuntimeState({
      elapsedMs: 2000,
      resonance: 0.7,
      schoolIndex: 3,
      vowelDensity: 0.4,
      palette0: [0.1, 0.2, 0.3],
      canvasSize: [800, 600],
    });
    expect(s.clock.elapsedSeconds).toBeCloseTo(2.0);
    expect(s.verse.resonance).toBe(0.7);
    expect(s.verse.vowelDensity).toBe(0.4);
    expect(s.spell.schoolIndex).toBe(3);
    expect(s.palette['0'].rgb01).toEqual([0.1, 0.2, 0.3]);
    expect(s.canvas.size).toEqual([800, 600]);
  });

  it('supplies deterministic defaults when fields are omitted', () => {
    const s = buildRuntimeState({ elapsedMs: 0 });
    expect(s.verse.resonance).toBe(0.5);
    expect(s.spell.schoolIndex).toBe(0);
    expect(Array.isArray(s.palette['0'].rgb01)).toBe(true);
  });
});
