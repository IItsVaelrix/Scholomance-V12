import { describe, it, expect } from 'vitest';
import { compileScholoTimeFrame } from '../scholotime.compiler.js';

describe('ScholoTime Compiler', () => {
  const TEST_SCHOLOTIME_PROJECT = {
    schemaVersion: 'ScholoTimeProject.v1',
    projectId: 'test',
    timing: { fps: 60, durationMs: 10000, bpm: 120, timeSignature: [4, 4] },
    sections: [{ id: 'intro', startMs: 0, endMs: 5000, energy: 0.5 }],
    lyrics: [],
    cues: [],
    visualTracks: []
  };

  it('same project + same frame emits identical packet', () => {
    const p1 = compileScholoTimeFrame(TEST_SCHOLOTIME_PROJECT, 60);
    const p2 = compileScholoTimeFrame(TEST_SCHOLOTIME_PROJECT, 60);
    expect(p1).toEqual(p2);
  });

  it('frame packet contains expected beat/bar/section', () => {
    const packet = compileScholoTimeFrame(TEST_SCHOLOTIME_PROJECT, 60);
    // Frame 60 @ 60 FPS = 1000ms. 120 bpm = 2 beats per second.
    expect(packet.timeMs).toBe(1000);
    expect(packet.music.beatIndex).toBe(2);
    expect(packet.music.sectionId).toBe('intro');
  });
});
