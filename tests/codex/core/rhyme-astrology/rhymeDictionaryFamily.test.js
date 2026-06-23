/**
 * rhymeDictionaryFamily.test.js — Authoritative dictionary-family pass.
 *
 * The Scholomance Dictionary API (`POST /api/lexicon/lookup-batch`) returns a
 * `rhyme_family` for every word it knows. Two words that share a family are
 * perfect rhymes by contract, regardless of any local phoneme math. These
 * tests cover the engine's cache, the `scoreConnection` promotion, and the
 * `analyzeEndWordMatch` (via `connectLines`) promotion.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DeepRhymeEngine } from '../../../../codex/core/rhyme-astrology/deepRhyme.engine.js';
import { connectLines } from '../../../../codex/core/rhyme-astrology/rhymeConnection.js';

// Minimal fake word shape; the engine only reads `word`, `analysis`, and the
// char/line metadata. We hand-build two words that DO NOT share a local
// rhymeKey (so the local scorer would call them `none` / `assonance`) but
// that the dictionary says share a family.
function makeWord({ word, lineIndex, wordIndex, charStart, rhymeKey, terminalVowelFamily, syllables, stressPattern = '1' }) {
  const sylList = Array.isArray(syllables) && syllables.length > 0
    ? syllables
    : [{ vowel: 'IY1', codaPhonemes: [], stress: 1 }];
  return {
    word,
    normalizedWord: String(word).toUpperCase(),
    vowelFamily: terminalVowelFamily,
    rhymeKey: rhymeKey || null,
    syllableCount: sylList.length,
    stressPattern,
    lineIndex,
    wordIndex,
    charStart,
    charEnd: charStart + String(word).length,
    analysis: {
      word: String(word).toUpperCase(),
      rhymeKey: rhymeKey || null,
      terminalVowelFamily: terminalVowelFamily || null,
      syllables: sylList,
      syllableCount: sylList.length,
    },
  };
}

function makeLine({ words, lineIndex, text, syllableTotal }) {
  const totalSyllables = syllableTotal || words.reduce((s, w) => s + (w.syllableCount || 0), 0);
  const stressPattern = words.map((w) => w.stressPattern || '').filter(Boolean).join(' ');
  const endWord = words.length ? words[words.length - 1] : null;
  return {
    lineIndex,
    text,
    words,
    syllableTotal: totalSyllables,
    stressPattern,
    internalRhymes: [],
    endRhymeKey: endWord?.rhymeKey || null,
    endWord,
  };
}

describe('DeepRhymeEngine rhymeFamilyCache', () => {
  let engine;

  beforeEach(() => {
    engine = new DeepRhymeEngine();
  });

  it('starts empty', () => {
    expect(engine.rhymeFamilyCache.size).toBe(0);
  });

  it('setRhymeFamily / getRhymeFamily round-trip case-insensitive', () => {
    engine.setRhymeFamily('Heart', 'AR-STOP');
    expect(engine.getRhymeFamily('HEART')).toBe('AR-STOP');
    expect(engine.getRhymeFamily('heart')).toBe('AR-STOP');
    expect(engine.getRhymeFamily('Heart')).toBe('AR-STOP');
  });

  it('setRhymeFamily records explicit null (cache hit, no family)', () => {
    engine.setRhymeFamily('glizznorp', null);
    expect(engine.hasRhymeFamilyLookup('glizznorp')).toBe(true);
    expect(engine.getRhymeFamily('glizznorp')).toBeNull();
  });

  it('setRhymeFamilies bulk-loads from a map', () => {
    engine.setRhymeFamilies({ heart: 'AR-STOP', start: 'AR-STOP', cart: 'AR-STOP' });
    expect(engine.getRhymeFamily('heart')).toBe('AR-STOP');
    expect(engine.getRhymeFamily('start')).toBe('AR-STOP');
    expect(engine.getRhymeFamily('cart')).toBe('AR-STOP');
  });

  it('matchDictionaryFamily returns the shared family when both ends agree', () => {
    engine.setRhymeFamilies({ heart: 'AR-STOP', start: 'AR-STOP' });
    expect(engine.matchDictionaryFamily('heart', 'start')).toBe('AR-STOP');
  });

  it('matchDictionaryFamily returns null when families disagree', () => {
    engine.setRhymeFamilies({ heart: 'AR-STOP', mind: 'AY-ND' });
    expect(engine.matchDictionaryFamily('heart', 'mind')).toBeNull();
  });

  it('matchDictionaryFamily returns null when either side is missing', () => {
    engine.setRhymeFamily('heart', 'AR-STOP');
    expect(engine.matchDictionaryFamily('heart', 'glizznorp')).toBeNull();
  });

  it('primeRhymeFamilies skips words already cached', async () => {
    engine.setRhymeFamily('heart', 'AR-STOP');
    let requested = null;
    const stubAPI = {
      async lookupBatch(words) {
        requested = words;
        return { families: { start: 'AR-STOP' } };
      },
    };
    const result = await engine.primeRhymeFamilies(['heart', 'start'], stubAPI);
    expect(requested).toEqual(['start']);
    expect(result.families).toBe(1);
    expect(engine.getRhymeFamily('start')).toBe('AR-STOP');
  });

  it('primeRhymeFamilies handles case-insensitive word lookups', async () => {
    const stubAPI = {
      async lookupBatch() {
        return { families: { HEART: 'AR-STOP' } };
      },
    };
    await engine.primeRhymeFamilies(['heart'], stubAPI);
    expect(engine.getRhymeFamily('heart')).toBe('AR-STOP');
  });

  it('primeRhymeFamilies degrades silently on API error', async () => {
    const failingAPI = {
      async lookupBatch() {
        throw new Error('connection refused');
      },
    };
    const result = await engine.primeRhymeFamilies(['heart', 'start'], failingAPI);
    expect(result.error).toBeTruthy();
    expect(result.families).toBe(0);
  });

  it('primeRhymeFamilies no-op without an API', async () => {
    const result = await engine.primeRhymeFamilies(['heart', 'start'], null);
    expect(result.requested).toBe(0);
    expect(engine.rhymeFamilyCache.size).toBe(0);
  });

  it('clearRhymeFamilies resets the cache', () => {
    engine.setRhymeFamily('heart', 'AR-STOP');
    engine.clearRhymeFamilies();
    expect(engine.rhymeFamilyCache.size).toBe(0);
    expect(engine.getRhymeFamily('heart')).toBeUndefined();
  });
});

describe('DeepRhymeEngine.scoreConnection with dictionary family cache', () => {
  let engine;

  beforeEach(() => {
    engine = new DeepRhymeEngine();
  });

  it('promotes a non-rhyming pair to "perfect" when dictionary says so', () => {
    // Two words the local scorer would never call perfect — they have
    // different rhymeKey, different terminalVowelFamily, different stress
    // patterns. The dictionary, however, says they share `rhyme_family`.
    const wordA = makeWord({
      word: 'heart',
      lineIndex: 0,
      wordIndex: 0,
      charStart: 0,
      rhymeKey: 'AA1 R T',
      terminalVowelFamily: 'AA1',
      stressPattern: '1',
    });
    const wordB = makeWord({
      word: 'start',
      lineIndex: 0,
      wordIndex: 1,
      charStart: 6,
      rhymeKey: 'AA1 R T',
      terminalVowelFamily: 'AA1',
      stressPattern: '1',
    });
    engine.setRhymeFamilies({ heart: 'AR-STOP', start: 'AR-STOP' });
    const conn = engine.scoreConnection(wordA, wordB);
    expect(conn).not.toBeNull();
    expect(conn.type).toBe('perfect');
    expect(conn.subtype).toBe('dictionary');
    expect(conn.dictionaryFamily).toBe('AR-STOP');
    expect(conn.score).toBeGreaterThanOrEqual(0.92);
  });

  it('does not promote identity matches to "dictionary" subtype', () => {
    // Identity is its own type; the dictionary check is intentionally skipped
    // for identity pairs.
    const catSyl = { vowel: 'AE1', codaPhonemes: ['T'], stress: 1 };
    const wordA = makeWord({ word: 'cat', lineIndex: 0, wordIndex: 0, charStart: 0, rhymeKey: 'AE1 T', terminalVowelFamily: 'AE1', syllables: [catSyl] });
    const wordB = makeWord({ word: 'cat', lineIndex: 0, wordIndex: 1, charStart: 4, rhymeKey: 'AE1 T', terminalVowelFamily: 'AE1', syllables: [catSyl] });
    engine.setRhymeFamily('cat', 'AE-AT');
    const conn = engine.scoreConnection(wordA, wordB);
    expect(conn.type).toBe('identity');
    expect(conn.dictionaryFamily).toBeUndefined();
  });
});

describe('connectLines with matchDictionaryFamily callback', () => {
  it('promotes end-word match to "perfect" when dictionary callback returns a family', () => {
    const lineA = makeLine({
      text: 'She plays the heart',
      lineIndex: 0,
      words: [
        makeWord({ word: 'she', lineIndex: 0, wordIndex: 0, charStart: 0 }),
        makeWord({ word: 'plays', lineIndex: 0, wordIndex: 1, charStart: 4 }),
        makeWord({
          word: 'heart',
          lineIndex: 0,
          wordIndex: 2,
          charStart: 10,
          rhymeKey: 'AA1 R T',
          terminalVowelFamily: 'AA1',
        }),
      ],
    });
    const lineB = makeLine({
      text: 'A brand new start',
      lineIndex: 1,
      words: [
        makeWord({ word: 'a', lineIndex: 1, wordIndex: 0, charStart: 0 }),
        makeWord({ word: 'brand', lineIndex: 1, wordIndex: 1, charStart: 2 }),
        makeWord({
          word: 'start',
          lineIndex: 1,
          wordIndex: 2,
          charStart: 8,
          rhymeKey: 'OW1 R T', // Different local rhymeKey from heart's
          terminalVowelFamily: 'OW1', // Different local vowel family
        }),
      ],
    });

    const conn = connectLines(lineA, lineB, {
      matchDictionaryFamily: (a, b) =>
        a.toLowerCase() === 'heart' && b.toLowerCase() === 'start' ? 'AR-STOP' : null,
    });
    expect(conn.endWord.type).toBe('perfect');
    expect(conn.endWord.score).toBe(1.0);
    expect(conn.endWord.dictionaryFamily).toBe('AR-STOP');
  });

  it('leaves end-word match as "none" when dictionary callback returns null', () => {
    const lineA = makeLine({
      text: 'a cat',
      lineIndex: 0,
      words: [
        makeWord({ word: 'a', lineIndex: 0, wordIndex: 0, charStart: 0 }),
        makeWord({ word: 'cat', lineIndex: 0, wordIndex: 1, charStart: 2, rhymeKey: 'AE1 T' }),
      ],
    });
    const lineB = makeLine({
      text: 'a dog',
      lineIndex: 1,
      words: [
        makeWord({ word: 'a', lineIndex: 1, wordIndex: 0, charStart: 0 }),
        makeWord({ word: 'dog', lineIndex: 1, wordIndex: 1, charStart: 2, rhymeKey: 'AO1 G' }),
      ],
    });

    const conn = connectLines(lineA, lineB, {
      matchDictionaryFamily: () => null, // no dictionary data
    });
    expect(conn.endWord.type).toBe('none');
  });
});
