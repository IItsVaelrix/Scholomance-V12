import { describe, it, expect } from 'vitest';
import {
  readMeter,
  pronounceWithMeter,
  isStressShiftHomograph,
} from '../../../codex/core/phonology/prosodic-metronome.js';

describe('prosodic metronome — stress-shift homograph disambiguation', () => {
  it('reads a noun frame from a preceding determiner', () => {
    expect(readMeter(['a', 'record'], 1)).toBe('noun');
    expect(readMeter(['the', 'present'], 1)).toBe('noun');
    expect(readMeter(['a', 'new', 'record'], 2)).toBe('noun');
  });

  it('reads a verb frame from a preceding to / modal / subject pronoun', () => {
    expect(readMeter(['to', 'record', 'it'], 1)).toBe('verb');
    expect(readMeter(['will', 'present', 'the', 'plan'], 1)).toBe('verb');
    expect(readMeter(['i', 'object', 'strongly'], 1)).toBe('verb');
  });

  it('returns null when the frame is ambiguous', () => {
    expect(readMeter(['record'], 0)).toBeNull();
    expect(readMeter(['and', 'record'], 1)).toBeNull();
  });

  it('places primary stress on syllable 1 for a noun frame', () => {
    const phonemes = pronounceWithMeter('record', ['a', 'record'], 1);
    expect(phonemes).toEqual(['R', 'EH1', 'K', 'ER0', 'D']);
  });

  it('places primary stress on syllable 2 for a verb frame', () => {
    const phonemes = pronounceWithMeter('record', ['to', 'record', 'it'], 1);
    expect(phonemes).toEqual(['R', 'AH0', 'K', 'AO1', 'R', 'D']);
  });

  it('returns null for words outside the stress-shift class (defer to normal G2P)', () => {
    expect(isStressShiftHomograph('table')).toBe(false);
    expect(pronounceWithMeter('table', ['a', 'table'], 1)).toBeNull();
  });
});
