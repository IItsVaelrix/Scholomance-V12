import { describe, it, expect } from 'vitest';
import { frameIndexToTimeMs, resolveBeatState, resolveBarState } from '../scholotime.math.js';

describe('ScholoTime Math', () => {
  it('frameIndexToTimeMs correctly converts frames to ms', () => {
    expect(frameIndexToTimeMs(60, 60)).toBe(1000);
    expect(frameIndexToTimeMs(30, 60)).toBe(500);
  });

  it('resolveBeatState calculates exact beat indexes', () => {
    const state = resolveBeatState(500, { bpm: 120 });
    // 120 bpm = 2 beats per second. 500ms = 1 beat.
    expect(state.index).toBe(1);
    expect(state.exactBeat).toBe(1);
    expect(state.phase).toBe(0);

    const state2 = resolveBeatState(250, { bpm: 120 });
    // 250ms = 0.5 beats
    expect(state2.index).toBe(0);
    expect(state2.phase).toBe(0.5);
  });

  it('resolveBarState calculates bar indexes', () => {
    const beatState = { exactBeat: 8 }; // 8 beats total
    const barState = resolveBarState(beatState, [4, 4]); // 4 beats per bar
    expect(barState.index).toBe(2);
    expect(barState.phase).toBe(0);
  });
});
