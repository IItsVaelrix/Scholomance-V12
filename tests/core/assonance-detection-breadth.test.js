import { describe, it, expect } from 'vitest';
import { DeepRhymeEngine } from '../../codex/core/rhyme-astrology/deepRhyme.engine.js';

const engine = new DeepRhymeEngine();

async function connectionBetween(text, a, b) {
  const result = await engine.analyzeDocument(text);
  return result.allConnections.find(
    (c) =>
      (c.wordA.word.toLowerCase() === a && c.wordB.word.toLowerCase() === b) ||
      (c.wordA.word.toLowerCase() === b && c.wordB.word.toLowerCase() === a),
  ) || null;
}

describe('assonance detection breadth — cross-line interior monosyllables', () => {
  it('detects a cross-line vowel echo between interior monosyllabic content words', async () => {
    // blood (L1, AH, interior) and sun (L2, AH, interior) — both monosyllabic
    // content words sharing the stressed vowel family AH, neither a line-end
    // word (flows / rise are the end words). Previously skipped entirely by the
    // multisyllabic-anchor restriction in findCrossLineAssonanceConnections;
    // the broadened detection now surfaces the echo as a connection.
    const verse = 'the blood still flows\nthe sun will rise';
    const conn = await connectionBetween(verse, 'blood', 'sun');
    expect(conn).not.toBeNull();
  });

  it('does NOT cross vowel families (anti-over-coloring guard preserved)', async () => {
    // free (IY) and day (EY) share no vowel family — must stay unconnected
    // even with monosyllabic anchors enabled.
    const conn = await connectionBetween('at last I am free\nuntil the day', 'free', 'day');
    expect(conn).toBeNull();
  });
});
