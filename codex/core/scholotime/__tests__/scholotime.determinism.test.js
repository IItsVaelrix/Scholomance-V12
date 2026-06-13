import { describe, it, expect } from 'vitest';
import { compileScholoTimeFrame } from '../scholotime.compiler.js';

describe('ScholoTime Determinism', () => {
  const TEST_PROJECT = {
    schemaVersion: 'ScholoTimeProject.v1',
    projectId: 'determinism-test',
    timing: { fps: 60, durationMs: 10000, bpm: 120, timeSignature: [4, 4] },
    sections: [],
    lyrics: [],
    cues: [],
  };

  it('rejects project with invalid FPS', () => {
    const badProj = { ...TEST_PROJECT, timing: { ...TEST_PROJECT.timing, fps: 0 } };
    expect(() => compileScholoTimeFrame(badProj, 0)).toThrow(/INVALID_FPS/);
  });

  it('rejects cue with endMs < startMs', () => {
    const badProj = {
      ...TEST_PROJECT,
      cues: [{ id: 'c1', target: 't1', startMs: 2000, endMs: 1000 }]
    };
    expect(() => compileScholoTimeFrame(badProj, 0)).toThrow(/CUE_RANGE_INVALID/);
  });

  it('compiles frame 100 twice and compares deep equality', () => {
    const p1 = compileScholoTimeFrame(TEST_PROJECT, 100);
    const p2 = JSON.parse(JSON.stringify(compileScholoTimeFrame(TEST_PROJECT, 100)));
    expect(p1).toEqual(p2);
  });
});
