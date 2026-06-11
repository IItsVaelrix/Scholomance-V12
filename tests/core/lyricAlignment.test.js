import { describe, expect, it } from 'vitest';
import {
  parseAlignment,
  lineAtTime,
  wordAtTime,
} from '../../src/kits/scholomance-visualizer-kit/utils/lyricAlignment';

const FIXTURE = {
  version: 'alignment-v1',
  trackId: 't1',
  source: { aligner: 'torchaudio-mms_fa', separator: 'htdemucs', generatedAt: '2026-06-10T00:00:00Z' },
  lines: [
    { index: 0, startS: 9.3, endS: 12.8 },
    { index: 1, startS: 13.1, endS: 16.0 },
  ],
  words: [
    { line: 0, word: 0, text: 'I', startS: 9.3, endS: 9.4, confidence: 0.9, interpolated: false },
    { line: 0, word: 1, text: "don't", startS: 9.45, endS: 9.8, confidence: 0.8, interpolated: false },
    { line: 1, word: 0, text: 'care', startS: 13.1, endS: 13.6, confidence: 0.95, interpolated: false },
  ],
};

describe('parseAlignment', () => {
  it('accepts a valid artifact', () => {
    expect(parseAlignment(FIXTURE)).not.toBeNull();
  });

  it.each([
    ['non-object', 'nope'],
    ['null', null],
    ['wrong version', { ...FIXTURE, version: 'alignment-v2' }],
    ['missing trackId', { ...FIXTURE, trackId: undefined }],
    ['empty lines', { ...FIXTURE, lines: [] }],
    ['empty words', { ...FIXTURE, words: [] }],
    ['null line time (failed line)', { ...FIXTURE, lines: [{ index: 0, startS: null, endS: null }, ...FIXTURE.lines.slice(1)] }],
    ['non-finite word time', { ...FIXTURE, words: [{ ...FIXTURE.words[0], startS: Infinity }, ...FIXTURE.words.slice(1)] }],
    ['unsorted words', { ...FIXTURE, words: [FIXTURE.words[2], FIXTURE.words[0], FIXTURE.words[1]] }],
    ['unsorted lines', { ...FIXTURE, lines: [FIXTURE.lines[1], FIXTURE.lines[0]] }],
    ['missing source (UI reads provenance from it)', { ...FIXTURE, source: undefined }],
    ['non-string source.aligner', { ...FIXTURE, source: { ...FIXTURE.source, aligner: 7 } }],
  ])('rejects %s', (_name, bad) => {
    expect(parseAlignment(bad)).toBeNull();
  });
});

describe('lineAtTime', () => {
  const lines = FIXTURE.lines;
  it('is -1 before the first line starts', () => expect(lineAtTime(lines, 0)).toBe(-1));
  it('activates at exactly startS', () => expect(lineAtTime(lines, 9.3)).toBe(0));
  it('holds the line through the gap to the next line', () => expect(lineAtTime(lines, 12.95)).toBe(0));
  it('advances at the next startS', () => expect(lineAtTime(lines, 13.1)).toBe(1));
  it('holds the last line after its end', () => expect(lineAtTime(lines, 200)).toBe(1));
});

describe('wordAtTime', () => {
  const words = FIXTURE.words;
  it('is -1 before the first word', () => expect(wordAtTime(words, 1)).toBe(-1));
  it('returns the word containing t', () => expect(wordAtTime(words, 9.5)).toBe(1));
  it('activates at exactly startS', () => expect(wordAtTime(words, 9.45)).toBe(1));
  it('is -1 in the gap between words', () => expect(wordAtTime(words, 9.42)).toBe(-1));
  it('is -1 after the last word ends', () => expect(wordAtTime(words, 14)).toBe(-1));
});
