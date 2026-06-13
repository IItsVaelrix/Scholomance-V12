import { describe, it, expect } from 'vitest';
import { resolveSectionAtTime, resolveCuesAtTime } from '../scholotime.timeline.js';

describe('ScholoTime Timeline', () => {
  const sections = [
    { id: 'intro', startMs: 0, endMs: 5000 },
    { id: 'drop', startMs: 5000, endMs: 10000 }
  ];

  it('resolves active section at exact start', () => {
    expect(resolveSectionAtTime(sections, 5000).id).toBe('drop');
  });

  it('excludes section after end', () => {
    expect(resolveSectionAtTime(sections, 10000)).toBeNull();
  });

  it('computes cue progress correctly', () => {
    const cues = [{ id: '1', startMs: 1000, endMs: 2000, easing: 'linear' }];
    const res = resolveCuesAtTime(cues, 1500);
    expect(res.length).toBe(1);
    expect(res[0].progress).toBe(0.5);
    expect(res[0].eased).toBe(0.5);
  });

  it('resolves overlapping cues in stable sorted order', () => {
    const cues = [
      { id: 'b', startMs: 1000, endMs: 2000 },
      { id: 'a', startMs: 1000, endMs: 2000 }
    ];
    const res = resolveCuesAtTime(cues, 1500);
    expect(res[0].id).toBe('a');
    expect(res[1].id).toBe('b');
  });
});
